/* =============================================================================
   Add MORE employees to a tenant that was already created by
   seed-new-employer-performance-test.sql, CONTINUING the exact same balanced
   k-ary reporting tree from where it left off (same @SpanOfControl), so you
   can incrementally scale one tenant (e.g. 10k -> 100k) with a consistent,
   comparable hierarchy instead of creating a brand-new tenant each time.

   HOW IT FINDS WHERE THE TREE LEFT OFF:
   The seed script encodes each employee's original tree position ("SeedIndex")
   in TEmployeeInfo.EmploymentNumber as 'PT' + a 7-digit zero-padded number
   (e.g. 'PT0000421'). This script decodes that to rebuild the SeedIndex ->
   EmployeeId map for the employees that already exist, finds the current max
   SeedIndex, and continues the same arithmetic tree formula from there.

   REQUIREMENTS:
     - @EmployerId must be a tenant created by seed-new-employer-performance-test.sql
       (or a previous run of this script) -- i.e. it must have at least one
       TEmployeeInfo.EmploymentNumber matching the 'PT' + 7-digit pattern.
       If none are found, this script stops with an error rather than guessing.
     - @SpanOfControl MUST be the SAME value used when the tenant was created
       (or last extended). There is nothing stored that records the original
       span, so this script cannot detect or validate a mismatch -- passing a
       different value will produce an inconsistent tree. If you don't
       remember it, check the original seed run's PRINT output, or inspect
       COUNT(*) of the root employee's direct TORGChart reports.
     - Reuses whatever Title/Location/EmploymentType/BusinessUnit rows already
       exist for @EmployerId (from the original clone) -- does not re-clone
       anything from a template employer.

   WHAT THIS DOES NOT TOUCH: TEmployerDetails, TCustomerSettings, TTitle,
   TOrgHierarchyDetails, TLocation, TMEmploymentTypes, and the 3 test logins
   are all left as-is. TLicence.TotalLicence is bumped up ONLY if the new
   total employee count would exceed it.

   To remove a tenant entirely (whether created by the seed script or grown
   with this one), see adhoc-sql/employees/cleanup-perftest-employer.sql.
   ========================================================================== */

SET NOCOUNT ON;
SET DEADLOCK_PRIORITY LOW;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these three, then run the whole script
------------------------------------------------------------------------------
DECLARE @EmployerId          INT = 231;    -- the EXISTING tenant to add employees to
DECLARE @AdditionalEmployeeCount INT = 50000; -- how many MORE employees to add
DECLARE @SpanOfControl       INT = 10;     -- MUST match the value used when this tenant was created/last extended
DECLARE @BatchSize           INT = 20000;  -- rows per batch/transaction

IF @AdditionalEmployeeCount < 1 THROW 50000, 'AdditionalEmployeeCount must be >= 1.', 1;
IF @SpanOfControl < 2 THROW 50000, 'SpanOfControl must be >= 2.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @EmployerId)
    THROW 50000, 'EmployerId does not exist in TEmployerDetails.', 1;

------------------------------------------------------------------------------
-- 2. REBUILD THE EXISTING SeedIndex -> EmployeeId MAP FROM EmploymentNumber
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#SeedMap') IS NOT NULL DROP TABLE #SeedMap;
CREATE TABLE #SeedMap (SeedIndex INT NOT NULL PRIMARY KEY, EmployeeId INT NOT NULL);

INSERT INTO #SeedMap (SeedIndex, EmployeeId)
SELECT CAST(SUBSTRING(EmploymentNumber, 3, 7) AS INT), EmployeeId
FROM dbo.TEmployeeInfo
WHERE EmployerID = @EmployerId
  AND EmploymentNumber LIKE 'PT[0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  AND LEN(EmploymentNumber) = 9;

DECLARE @CurrentMaxSeedIndex INT = (SELECT MAX(SeedIndex) FROM #SeedMap);
IF @CurrentMaxSeedIndex IS NULL
    THROW 50000, 'No seed-script-generated employees (EmploymentNumber like ''PT0000001'') found for this EmployerId -- this tenant wasn''t created by seed-new-employer-performance-test.sql, so there is no tree position to continue from.', 1;

PRINT 'Existing tree has ' + CAST(@CurrentMaxSeedIndex AS VARCHAR(10)) + ' employees (max SeedIndex). Adding '
    + CAST(@AdditionalEmployeeCount AS VARCHAR(10)) + ' more, span=' + CAST(@SpanOfControl AS VARCHAR(10)) + '.';

------------------------------------------------------------------------------
-- 3. ROUND-ROBIN LOOKUP LISTS -- reuse whatever master data this tenant
--    already has (from its original creation); nothing is re-cloned here.
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#TitleList') IS NOT NULL DROP TABLE #TitleList;
SELECT ROW_NUMBER() OVER (ORDER BY ID) AS Idx, ID
INTO #TitleList
FROM dbo.TTitle WHERE Employerid = @EmployerId AND IsActive = 'Y';
DECLARE @TitleCount INT = (SELECT COUNT(*) FROM #TitleList);

IF OBJECT_ID('tempdb..#LocationList') IS NOT NULL DROP TABLE #LocationList;
SELECT ROW_NUMBER() OVER (ORDER BY LocationId) AS Idx, LocationId AS ID
INTO #LocationList
FROM dbo.TLocation WHERE Employerid = @EmployerId AND IsActive = 1;
DECLARE @LocationCount INT = (SELECT COUNT(*) FROM #LocationList);

IF OBJECT_ID('tempdb..#EmploymentTypeList') IS NOT NULL DROP TABLE #EmploymentTypeList;
SELECT ROW_NUMBER() OVER (ORDER BY EmploymentTypeID) AS Idx, EmploymentTypeID AS ID
INTO #EmploymentTypeList
FROM dbo.TMEmploymentTypes WHERE Employerid = @EmployerId AND IsActive = 1;
DECLARE @EmploymentTypeCount INT = (SELECT COUNT(*) FROM #EmploymentTypeList);

IF OBJECT_ID('tempdb..#UnitList') IS NOT NULL DROP TABLE #UnitList;
SELECT ROW_NUMBER() OVER (ORDER BY UnitID) AS Idx, UnitID AS ID
INTO #UnitList
FROM dbo.TOrgHierarchyDetails WHERE Employerid = @EmployerId AND isactive = 'Y' AND ISNULL(isdelete, 'N') <> 'Y';
DECLARE @UnitCount INT = (SELECT COUNT(*) FROM #UnitList);

IF @TitleCount = 0          THROW 50000, 'This tenant has no active TTitle rows.', 1;
IF @LocationCount = 0       THROW 50000, 'This tenant has no active TLocation rows.', 1;
IF @EmploymentTypeCount = 0 THROW 50000, 'This tenant has no active TMEmploymentTypes rows.', 1;
IF @UnitCount = 0           THROW 50000, 'This tenant has no active TOrgHierarchyDetails rows.', 1;

------------------------------------------------------------------------------
-- 4. BULK-GENERATE THE ADDITIONAL EMPLOYEES, CONTINUING THE SAME TREE
------------------------------------------------------------------------------
DECLARE @DomainTag  VARCHAR(40) = 'perftest' + CAST(@EmployerId AS VARCHAR(10)) + '.test';
DECLARE @BatchStart INT = @CurrentMaxSeedIndex + 1;
DECLARE @BatchEnd   INT;
DECLARE @NewMaxSeedIndex INT = @CurrentMaxSeedIndex + @AdditionalEmployeeCount;

WHILE @BatchStart <= @NewMaxSeedIndex
BEGIN
    SET @BatchEnd = CASE WHEN @BatchStart + @BatchSize - 1 > @NewMaxSeedIndex
                         THEN @NewMaxSeedIndex ELSE @BatchStart + @BatchSize - 1 END;

    IF OBJECT_ID('tempdb..#BatchSeed') IS NOT NULL DROP TABLE #BatchSeed;

    ;WITH E1(N) AS (SELECT N FROM (VALUES(1),(1),(1),(1),(1),(1),(1),(1),(1),(1)) AS X(N)),
          E2(N) AS (SELECT 1 FROM E1 a CROSS JOIN E1 b),
          E4(N) AS (SELECT 1 FROM E2 a CROSS JOIN E2 b),
          Tally(SeedIndex) AS (
              SELECT TOP (@BatchEnd - @BatchStart + 1)
                     @BatchStart - 1 + ROW_NUMBER() OVER (ORDER BY (SELECT NULL))
              FROM E4 a CROSS JOIN E4 b
          )
    SELECT
        SeedIndex,
        ((SeedIndex - 2) / @SpanOfControl) + 1 AS ParentSeedIndex   -- SeedIndex is always > 1 here (root already exists), so no NULL case needed
    INTO #BatchSeed
    FROM Tally;

    BEGIN TRAN AddBatch;

        -- Same MERGE+OUTPUT trick as the seed script -- see that file's
        -- comments for why a plain INSERT...OUTPUT won't work here.
        MERGE INTO dbo.TEmployee AS tgt
        USING #BatchSeed AS src
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (FName, LName, EmailID, IsActive, Employerid, EthnicGroup, Gender, DoB)
            VALUES (
                'PerfTest',
                'Employee' + CAST(src.SeedIndex AS VARCHAR(10)),
                'perftest.' + CAST(src.SeedIndex AS VARCHAR(10)) + '@' + @DomainTag,
                'Y', @EmployerId, 'NA',
                CASE WHEN src.SeedIndex % 2 = 0 THEN 1 ELSE 2 END,
                DATEADD(YEAR, -25 - (src.SeedIndex % 20), CAST(GETDATE() AS DATE))
            )
        OUTPUT src.SeedIndex, inserted.EmployeeId INTO #SeedMap (SeedIndex, EmployeeId);

        INSERT INTO dbo.TEmployeeInfo
            (EmployeeId, EmployerID, Title, FunctionalManager, BusinessUnitId, Department,
             EmploymentNumber, EmploymentTypeID, LocationId, DOJ, Resident, DeductFNPF, ExperienceCategory,
             Grade, WorkLocation, EmployeeRoleId, CategoryId)
        SELECT
            m.EmployeeId, @EmployerId, tt.ID, pm.EmployeeId, bu.ID, bu.ID,
            'PT' + RIGHT('0000000' + CAST(bs.SeedIndex AS VARCHAR(10)), 7),
            et.ID, loc.ID,
            DATEADD(DAY, -(bs.SeedIndex % 3650), CAST(GETDATE() AS DATE)),
            1, 1, 'NA',
            (bs.SeedIndex % 5) + 1,
            (bs.SeedIndex % 3) + 1,
            (bs.SeedIndex % 3) + 1,
            (bs.SeedIndex % 2) + 1
        FROM #BatchSeed bs
        JOIN #SeedMap m  ON m.SeedIndex = bs.SeedIndex
        JOIN #SeedMap pm ON pm.SeedIndex = bs.ParentSeedIndex     -- parent may be an OLD (already existing) or a NEW (earlier in this run) employee -- #SeedMap has both
        JOIN #TitleList tt          ON tt.Idx  = (bs.SeedIndex % @TitleCount) + 1
        JOIN #LocationList loc      ON loc.Idx = (bs.SeedIndex % @LocationCount) + 1
        JOIN #EmploymentTypeList et ON et.Idx  = (bs.SeedIndex % @EmploymentTypeCount) + 1
        JOIN #UnitList bu           ON bu.Idx  = (bs.SeedIndex % @UnitCount) + 1;

        INSERT INTO dbo.TORGChart (EmployeeID, ReportsTo, effectivedate)
        SELECT m.EmployeeId, pm.EmployeeId, CAST(GETDATE() AS DATE)
        FROM #BatchSeed bs
        JOIN #SeedMap m  ON m.SeedIndex = bs.SeedIndex
        JOIN #SeedMap pm ON pm.SeedIndex = bs.ParentSeedIndex;

    COMMIT TRAN AddBatch;

    PRINT 'Added employees ' + CAST(@BatchStart AS VARCHAR(10)) + '..' + CAST(@BatchEnd AS VARCHAR(10))
        + ' of ' + CAST(@NewMaxSeedIndex AS VARCHAR(10));

    SET @BatchStart = @BatchEnd + 1;
END

IF OBJECT_ID('tempdb..#BatchSeed') IS NOT NULL DROP TABLE #BatchSeed;
IF OBJECT_ID('tempdb..#TitleList') IS NOT NULL DROP TABLE #TitleList;
IF OBJECT_ID('tempdb..#LocationList') IS NOT NULL DROP TABLE #LocationList;
IF OBJECT_ID('tempdb..#EmploymentTypeList') IS NOT NULL DROP TABLE #EmploymentTypeList;
IF OBJECT_ID('tempdb..#UnitList') IS NOT NULL DROP TABLE #UnitList;
IF OBJECT_ID('tempdb..#SeedMap') IS NOT NULL DROP TABLE #SeedMap;

------------------------------------------------------------------------------
-- 5. BUMP TLicence.TotalLicence IF THE NEW TOTAL WOULD EXCEED IT
------------------------------------------------------------------------------
DECLARE @NewTotalEmployees INT = (SELECT COUNT(*) FROM dbo.TEmployee WHERE Employerid = @EmployerId);

UPDATE dbo.TLicence
   SET TotalLicence = @NewTotalEmployees + 1000
 WHERE EmployerID = @EmployerId AND TotalLicence < @NewTotalEmployees + 1000;

------------------------------------------------------------------------------
-- 6. SUMMARY
------------------------------------------------------------------------------
DECLARE @DepthWalk INT = @NewMaxSeedIndex, @Depth INT = 0;
WHILE @DepthWalk > 1
BEGIN
    SET @DepthWalk = ((@DepthWalk - 2) / @SpanOfControl) + 1;
    SET @Depth += 1;
END

PRINT '----------------------------------------------------------------------';
PRINT 'Done.';
PRINT 'Employerid          : ' + CAST(@EmployerId AS VARCHAR(10));
PRINT 'Employees added     : ' + CAST(@AdditionalEmployeeCount AS VARCHAR(10));
PRINT 'Total employees now : ' + CAST(@NewTotalEmployees AS VARCHAR(10));
PRINT 'Max tree depth now  : ' + CAST(@Depth AS VARCHAR(10)) + ' levels below the root';
PRINT '----------------------------------------------------------------------';
