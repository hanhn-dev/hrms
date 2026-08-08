/* =============================================================================
   Seed employees under CHILD organizations of a perf-test root tenant, and
   hang each child's tree off a manager on the ROOT so Direct/Indirect Reports
   (and Sp_CM_*_DirectIndirectReports*) see nested cross-org reportees.

   WHY THIS EXISTS:
     seed-new-employer-performance-test.sql can create empty child orgs
     (TEmployerDetails + TCustomerSettings only). Those children have no
     master data and no employees, so they cannot participate in reporting
     tests. add-employees-to-existing-employer.sql only extends a single
     employer that already has PT###### EmploymentNumbers -- it does not
     target children or clone their masters.

   HOW THE TREE CONNECTS:
     Child employee #1 (EmploymentNumber CHc{n}0000001) has
       TORGChart.ReportsTo = @AnchorManagerEmpId (an employee on the ROOT)
       TEmployeeInfo.FunctionalManager = same
     The rest of that child's employees form a k-ary tree under #1.
     Hierarchy walks use ReportsTo only (no Employerid filter), so with
     IsCrossReportingApplicable='Y' on the root, My Details / report SPs
     include these child-org employees as nested reportees of the anchor.

   REQUIREMENTS:
     - @RootEmployerId must already exist (perf-test root).
     - If no children exist yet, this script creates @ChildOrgCount of them
       (same pattern as the main seed) and clones master data from the root.
     - If children already exist but have no Title/Location/... rows, masters
       are cloned from the root before employees are inserted.
     - Also ensures MenuId=5 TRoleTabDetails (roles 1/3/4), search-purpose
       master, IsDonorDetails=0, and single-copy TEmployeeDetail_Fields so
       My Details does not Oops on fresh child tenants.
     - Does NOT create logins on the children (report from the root login).

   Edit the CONFIG block, then run.
   ========================================================================== */

SET NOCOUNT ON;
SET DEADLOCK_PRIORITY LOW;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @RootEmployerId      INT = 232;     -- perf-test ROOT (ParentEmployerid=0)
DECLARE @ChildOrgCount       INT = 3;       -- create this many children if none exist
DECLARE @EmployeesPerChild   INT = 1500;      -- employees to seed into EACH child
DECLARE @SpanOfControl       INT = 2;      -- reports per manager inside each child
DECLARE @BatchSize           INT = 20000;
-- Parent-org employee that child roots report to (NULL = auto-pick PT0000001,
-- falling back to PT0000002 / any active employee on the root).
DECLARE @AnchorManagerEmpId  INT = NULL;
DECLARE @TemplateEmployerId  INT = 10;      -- only used if root has no masters to clone from

IF @RootEmployerId IS NULL OR @RootEmployerId <= 0
    THROW 50000, 'Set @RootEmployerId to the perf-test root Employerid.', 1;
IF @EmployeesPerChild < 1 THROW 50000, 'EmployeesPerChild must be >= 1.', 1;
IF @SpanOfControl < 2 THROW 50000, 'SpanOfControl must be >= 2.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @RootEmployerId)
    THROW 50000, 'RootEmployerId does not exist.', 1;

UPDATE dbo.TEmployerDetails
SET IsCrossReportingApplicable = 'Y'
WHERE Employerid = @RootEmployerId
  AND ISNULL(IsCrossReportingApplicable, 'N') <> 'Y';

------------------------------------------------------------------------------
-- 2. RESOLVE ANCHOR MANAGER ON THE ROOT
------------------------------------------------------------------------------
IF @AnchorManagerEmpId IS NULL
BEGIN
    SELECT @AnchorManagerEmpId = ei.EmployeeId
    FROM dbo.TEmployeeInfo ei
    WHERE ei.EmployerID = @RootEmployerId AND ei.EmploymentNumber = 'PT0000001';

    IF @AnchorManagerEmpId IS NULL
        SELECT @AnchorManagerEmpId = ei.EmployeeId
        FROM dbo.TEmployeeInfo ei
        WHERE ei.EmployerID = @RootEmployerId AND ei.EmploymentNumber = 'PT0000002';

    IF @AnchorManagerEmpId IS NULL
        SELECT TOP 1 @AnchorManagerEmpId = e.EmployeeId
        FROM dbo.TEmployee e
        WHERE e.Employerid = @RootEmployerId AND e.IsActive = 'Y'
        ORDER BY e.EmployeeId;
END

IF @AnchorManagerEmpId IS NULL
    OR NOT EXISTS (SELECT 1 FROM dbo.TEmployee WHERE EmployeeId = @AnchorManagerEmpId AND Employerid = @RootEmployerId)
    THROW 50000, 'Could not resolve @AnchorManagerEmpId on the root employer.', 1;

PRINT 'Anchor manager on root Employerid ' + CAST(@RootEmployerId AS VARCHAR(10))
    + ' = EmployeeId ' + CAST(@AnchorManagerEmpId AS VARCHAR(10));

------------------------------------------------------------------------------
-- 3. ENSURE CHILD ORGS EXIST
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#ChildOrgs') IS NOT NULL DROP TABLE #ChildOrgs;
CREATE TABLE #ChildOrgs (ChildEmployerId INT NOT NULL PRIMARY KEY, CustId VARCHAR(10) NOT NULL, Ordinal INT NOT NULL);

INSERT INTO #ChildOrgs (ChildEmployerId, CustId, Ordinal)
SELECT Employerid, custid,
       ROW_NUMBER() OVER (ORDER BY Employerid)
FROM dbo.TEmployerDetails
WHERE ParentEmployerid = @RootEmployerId;

IF NOT EXISTS (SELECT 1 FROM #ChildOrgs)
BEGIN
    IF @ChildOrgCount < 1
        THROW 50000, 'No child orgs under root and @ChildOrgCount < 1 -- nothing to do.', 1;

    DECLARE @RootName VARCHAR(100) =
        (SELECT EmployerName FROM dbo.TEmployerDetails WHERE Employerid = @RootEmployerId);
    DECLARE @i INT = 1, @ChildId INT, @ChildCust VARCHAR(10), @ChildName VARCHAR(100);
    DECLARE @ed_cols NVARCHAR(MAX), @ed_sel NVARCHAR(MAX), @ed_sql NVARCHAR(MAX);
    DECLARE @cs_cols NVARCHAR(MAX), @cs_sel NVARCHAR(MAX), @cs_sql NVARCHAR(MAX);

    SELECT @ed_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';

    WHILE @i <= @ChildOrgCount
    BEGIN
        BEGIN TRAN;

            SELECT @ChildId = ISNULL(MAX(Employerid), 0) + 1
            FROM dbo.TEmployerDetails WITH (UPDLOCK, HOLDLOCK, ROWLOCK);

            SET @ChildCust = 'C' + RIGHT('00000' + CAST(@ChildId AS VARCHAR(10)), 5);
            SET @ChildName = LEFT(ISNULL(@RootName, 'PERFTEST') + ' CHILD ' + CAST(@i AS VARCHAR(10)), 100);

            SELECT @ed_sel = STRING_AGG(
                    CAST(CASE name
                           WHEN 'Employerid' THEN '@ChildId'
                           WHEN 'EmployerName' THEN '@ChildName'
                           WHEN 'ParentEmployerid' THEN '@RootEmployerId'
                           WHEN 'RootEmployerId' THEN '@RootEmployerId'
                           WHEN 'custid' THEN '@ChildCust'
                           WHEN 'parentcustid' THEN 'NULL'
                           WHEN 'IsCrossReportingApplicable' THEN '''Y'''
                           ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';

            SET @ed_sql = N'INSERT INTO dbo.TEmployerDetails (' + @ed_cols + N')
SELECT ' + @ed_sel + N' FROM dbo.TEmployerDetails WHERE Employerid = @RootEmployerId;';
            EXEC sp_executesql @ed_sql,
                N'@ChildId INT, @ChildName VARCHAR(100), @RootEmployerId INT, @ChildCust VARCHAR(10)',
                @ChildId = @ChildId, @ChildName = @ChildName,
                @RootEmployerId = @RootEmployerId, @ChildCust = @ChildCust;

            SELECT @cs_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';
            SELECT @cs_sel = STRING_AGG(
                    CAST(CASE name WHEN 'CustomerId' THEN '@ChildCust'
                              WHEN 'EmployerId' THEN '@ChildId'
                              WHEN 'CustName' THEN '@ChildName'
                              ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';

            SET @cs_sql = N'INSERT INTO dbo.TCustomerSettings (' + @cs_cols + N')
SELECT ' + @cs_sel + N' FROM dbo.TCustomerSettings WHERE EmployerId = @RootEmployerId;';
            EXEC sp_executesql @cs_sql,
                N'@ChildCust VARCHAR(10), @ChildId INT, @ChildName VARCHAR(100), @RootEmployerId INT',
                @ChildCust = @ChildCust, @ChildId = @ChildId,
                @ChildName = @ChildName, @RootEmployerId = @RootEmployerId;

            -- Keep donor Budget Source tab off on child orgs (same as root seed).
            UPDATE dbo.TCustomerSettings
            SET IsDonorDetails = 0
            WHERE EmployerId = @ChildId;

            INSERT INTO #ChildOrgs (ChildEmployerId, CustId, Ordinal)
            VALUES (@ChildId, @ChildCust, @i);

        COMMIT TRAN;

        PRINT 'Created child org Employerid=' + CAST(@ChildId AS VARCHAR(10)) + ', custid=' + @ChildCust;
        SET @i += 1;
    END
END
ELSE
BEGIN
    DECLARE @ExistingChildCount INT = (SELECT COUNT(*) FROM #ChildOrgs);
    PRINT 'Using existing ' + CAST(@ExistingChildCount AS VARCHAR(10))
        + ' child org(s) under root ' + CAST(@RootEmployerId AS VARCHAR(10));
END

------------------------------------------------------------------------------
-- 4. FOR EACH CHILD: clone masters if empty, then seed employees
------------------------------------------------------------------------------
DECLARE @ChildEmployerId INT, @ChildOrdinal INT, @ChildCustId VARCHAR(10);
DECLARE @TitleSourceId INT, @LocationSourceId INT, @EmploymentTypeSourceId INT,
        @UnitSourceId INT, @GradeSourceId INT, @EmpRoleSourceId INT, @CalendarSourceId INT,
        @ProfileRoleTabSourceId INT, @FieldMetadataSourceId INT;
DECLARE @CountryId INT =
    (SELECT ISNULL(CountryId, 99) FROM dbo.TEmployerDetails WHERE Employerid = @RootEmployerId);

DECLARE curChildren CURSOR LOCAL FAST_FORWARD FOR
    SELECT ChildEmployerId, Ordinal, CustId FROM #ChildOrgs ORDER BY Ordinal;
OPEN curChildren;
FETCH NEXT FROM curChildren INTO @ChildEmployerId, @ChildOrdinal, @ChildCustId;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '----------------------------------------------------------------------';
    PRINT 'Seeding child Employerid=' + CAST(@ChildEmployerId AS VARCHAR(10))
        + ' (custid ' + @ChildCustId + ') with ' + CAST(@EmployeesPerChild AS VARCHAR(10)) + ' employees...';

    -- Skip if this child already has PT-style (or CH-style) employees
    IF EXISTS (
        SELECT 1 FROM dbo.TEmployeeInfo
        WHERE EmployerID = @ChildEmployerId
          AND (EmploymentNumber LIKE 'PT[0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
            OR EmploymentNumber LIKE 'CH' + CAST(@ChildOrdinal AS VARCHAR(10)) + '%')
    )
    BEGIN
        PRINT 'Child already has seeded employees -- skipped. Delete them first to re-seed.';
        FETCH NEXT FROM curChildren INTO @ChildEmployerId, @ChildOrdinal, @ChildCustId;
        CONTINUE;
    END

    SET @TitleSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TTitle WHERE Employerid = @RootEmployerId AND IsActive = 'Y')
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @LocationSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TLocation WHERE Employerid = @RootEmployerId AND IsActive = 1)
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @EmploymentTypeSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TMEmploymentTypes WHERE Employerid = @RootEmployerId AND IsActive = 1)
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @UnitSourceId = CASE
        WHEN EXISTS (
            SELECT 1
            FROM dbo.TOrgHierarchyDetails
            WHERE Employerid = @RootEmployerId AND isactive = 'Y' AND ISNULL(isdelete, 'N') <> 'Y'
        )
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @GradeSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TGrade WHERE Employerid = @RootEmployerId AND IsActive = 1)
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @EmpRoleSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TEmployeeRoleMaster WHERE Employerid = @RootEmployerId AND IsActive = 1)
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @CalendarSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TCalendarMaster WHERE Employerid = @RootEmployerId AND IsActive = 1)
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @ProfileRoleTabSourceId = CASE
        WHEN EXISTS (
            SELECT 1
            FROM dbo.TEmployeeRoleUserTabDetails
            WHERE Employerid = @RootEmployerId
              AND RoleId IN (1, 3, 4)
              AND EmployeeId IS NULL
        )
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;
    SET @FieldMetadataSourceId = CASE
        WHEN EXISTS (SELECT 1 FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @RootEmployerId)
            THEN @RootEmployerId
        ELSE @TemplateEmployerId
    END;

    -- 4a. Master data (only if child has none)
    IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @ChildEmployerId)
    BEGIN
        DECLARE @edf_cols NVARCHAR(MAX), @edf_select NVARCHAR(MAX), @edf_sql NVARCHAR(MAX);
        SELECT @edf_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.TEmployeeDetail_Fields')
          AND is_identity = 0;
        SELECT @edf_select = STRING_AGG(
                CAST(CASE WHEN name = 'EmployerId' THEN '@ChildEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)),
                ','
            ) WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.TEmployeeDetail_Fields')
          AND is_identity = 0;
        SET @edf_sql = N'INSERT INTO dbo.TEmployeeDetail_Fields (' + @edf_cols + N')
SELECT ' + @edf_select + N' FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @FieldMetadataSourceId;';
        EXEC sp_executesql @edf_sql, N'@ChildEmployerId INT, @FieldMetadataSourceId INT',
            @ChildEmployerId = @ChildEmployerId, @FieldMetadataSourceId = @FieldMetadataSourceId;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.TTitle WHERE Employerid = @ChildEmployerId)
    BEGIN
        DECLARE @tt_cols NVARCHAR(MAX), @tt_sel NVARCHAR(MAX), @tt_sql NVARCHAR(MAX);
        SELECT @tt_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TTitle') AND is_identity = 0;
        SELECT @tt_sel = STRING_AGG(CAST(CASE WHEN name = 'Employerid' THEN '@ChildEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TTitle') AND is_identity = 0;
        SET @tt_sql = N'INSERT INTO dbo.TTitle (' + @tt_cols + N')
SELECT ' + @tt_sel + N' FROM dbo.TTitle WHERE Employerid = @TitleSourceId AND IsActive = ''Y'';';
        EXEC sp_executesql @tt_sql, N'@ChildEmployerId INT, @TitleSourceId INT',
            @ChildEmployerId = @ChildEmployerId, @TitleSourceId = @TitleSourceId;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.TLocation WHERE Employerid = @ChildEmployerId)
    BEGIN
        DECLARE @loc_cols NVARCHAR(MAX), @loc_sel NVARCHAR(MAX), @loc_sql NVARCHAR(MAX);
        SELECT @loc_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TLocation') AND is_identity = 0;
        SELECT @loc_sel = STRING_AGG(CAST(CASE WHEN name = 'Employerid' THEN '@ChildEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TLocation') AND is_identity = 0;
        SET @loc_sql = N'INSERT INTO dbo.TLocation (' + @loc_cols + N')
SELECT ' + @loc_sel + N' FROM dbo.TLocation WHERE Employerid = @LocationSourceId AND IsActive = 1;';
        EXEC sp_executesql @loc_sql, N'@ChildEmployerId INT, @LocationSourceId INT',
            @ChildEmployerId = @ChildEmployerId, @LocationSourceId = @LocationSourceId;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.TMEmploymentTypes WHERE Employerid = @ChildEmployerId)
    BEGIN
        DECLARE @et_cols NVARCHAR(MAX), @et_sel NVARCHAR(MAX), @et_sql NVARCHAR(MAX);
        SELECT @et_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TMEmploymentTypes') AND is_identity = 0;
        SELECT @et_sel = STRING_AGG(CAST(CASE WHEN name = 'Employerid' THEN '@ChildEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
        FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TMEmploymentTypes') AND is_identity = 0;
        SET @et_sql = N'INSERT INTO dbo.TMEmploymentTypes (' + @et_cols + N')
SELECT ' + @et_sel + N' FROM dbo.TMEmploymentTypes WHERE Employerid = @EmploymentTypeSourceId AND IsActive = 1;';
        EXEC sp_executesql @et_sql, N'@ChildEmployerId INT, @EmploymentTypeSourceId INT',
            @ChildEmployerId = @ChildEmployerId, @EmploymentTypeSourceId = @EmploymentTypeSourceId;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.TOrgHierarchyDetails WHERE Employerid = @ChildEmployerId)
    BEGIN
        IF OBJECT_ID('tempdb..#UnitSeed') IS NOT NULL DROP TABLE #UnitSeed;
        SELECT UnitID AS OldUnitID, ParentUnitid AS OldParentUnitid, UnitName, isactive, isdelete, CreatedBy, CreatedWhen, UpadtedBy, UpdatedWhen
        INTO #UnitSeed
        FROM dbo.TOrgHierarchyDetails
        WHERE Employerid = @UnitSourceId AND isactive = 'Y' AND ISNULL(isdelete, 'N') <> 'Y';

        IF OBJECT_ID('tempdb..#UnitMap') IS NOT NULL DROP TABLE #UnitMap;
        CREATE TABLE #UnitMap (OldUnitID INT NOT NULL PRIMARY KEY, NewUnitID INT NOT NULL);

        MERGE INTO dbo.TOrgHierarchyDetails AS tgt
        USING #UnitSeed AS src
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (UnitName, ParentUnitid, Employerid, isactive, isdelete, CreatedBy, CreatedWhen, UpadtedBy, UpdatedWhen)
            VALUES (src.UnitName, NULL, @ChildEmployerId, src.isactive, src.isdelete, src.CreatedBy, src.CreatedWhen, src.UpadtedBy, src.UpdatedWhen)
        OUTPUT src.OldUnitID, inserted.UnitID INTO #UnitMap (OldUnitID, NewUnitID);

        UPDATE t SET t.ParentUnitid = pm.NewUnitID
        FROM dbo.TOrgHierarchyDetails t
        JOIN #UnitMap m  ON m.NewUnitID = t.UnitID
        JOIN #UnitSeed s ON s.OldUnitID = m.OldUnitID
        JOIN #UnitMap pm ON pm.OldUnitID = s.OldParentUnitid
        WHERE t.Employerid = @ChildEmployerId;

        DROP TABLE #UnitSeed; DROP TABLE #UnitMap;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.TGrade WHERE Employerid = @ChildEmployerId AND IsActive = 1)
        INSERT INTO dbo.TGrade (GradeName, GradeDesc, GradeBand, IsActive, CreatedBy, CreatedDate, Employerid)
        SELECT GradeName, GradeDesc, GradeBand, IsActive, ISNULL(CreatedBy, 1), GETDATE(), @ChildEmployerId
        FROM dbo.TGrade WHERE Employerid = @GradeSourceId AND IsActive = 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeRoleMaster WHERE Employerid = @ChildEmployerId AND IsActive = 1)
        INSERT INTO dbo.TEmployeeRoleMaster (EmployeeRoleName, EmployeeRoleDesc, IsActive, CreatedBy, CreatedDate, Employerid)
        SELECT EmployeeRoleName, EmployeeRoleDesc, IsActive, ISNULL(CreatedBy, 1), GETDATE(), @ChildEmployerId
        FROM dbo.TEmployeeRoleMaster WHERE Employerid = @EmpRoleSourceId AND IsActive = 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.TCalendarMaster WHERE Employerid = @ChildEmployerId AND IsActive = 1)
        INSERT INTO dbo.TCalendarMaster
            (CalendarName, CalendarDesc, IsActive, CreatedBy, CreatedDate, Employerid,
             AllowHolidayOnWeeklyOff, IsHolidayPrecendenceOverWeeklyOff)
        SELECT CalendarName, CalendarDesc, IsActive, ISNULL(CreatedBy, 1), GETDATE(), @ChildEmployerId,
               AllowHolidayOnWeeklyOff, IsHolidayPrecendenceOverWeeklyOff
        FROM dbo.TCalendarMaster WHERE Employerid = @CalendarSourceId AND IsActive = 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.TEmployeeRoleUserTabDetails
        WHERE Employerid = @ChildEmployerId
          AND RoleId IN (1, 3, 4)
          AND EmployeeId IS NULL
    )
        INSERT INTO dbo.TEmployeeRoleUserTabDetails
            (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
             CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
        SELECT RoleId, NULL, ModuleSectionId, ModuleTabId, @ChildEmployerId, IsEditable,
               ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(), GETDATE(), ISNULL(UpdatedBy, ISNULL(CreatedBy, 1)), GETUTCDATE()
        FROM dbo.TEmployeeRoleUserTabDetails
        WHERE Employerid = @ProfileRoleTabSourceId
          AND RoleId IN (1, 3, 4)
          AND EmployeeId IS NULL;

    -- If source only had RoleId=1, mirror onto Manager (3) / Employee (4).
    INSERT INTO dbo.TEmployeeRoleUserTabDetails
        (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
         CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
    SELECT r.RoleId, NULL, src.ModuleSectionId, src.ModuleTabId, @ChildEmployerId, src.IsEditable,
           ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(),
           GETDATE(), ISNULL(src.UpdatedBy, ISNULL(src.CreatedBy, 1)), GETUTCDATE()
    FROM dbo.TEmployeeRoleUserTabDetails src
    CROSS JOIN (SELECT 3 AS RoleId UNION ALL SELECT 4) r
    WHERE src.Employerid = @ChildEmployerId
      AND src.RoleId = 1
      AND src.EmployeeId IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.TEmployeeRoleUserTabDetails x
          WHERE x.Employerid = @ChildEmployerId
            AND x.RoleId = r.RoleId
            AND x.EmployeeId IS NULL
            AND x.ModuleSectionId = src.ModuleSectionId
            AND x.ModuleTabId = src.ModuleTabId
      );

    -- MenuId=5 My Details page tabs for RoleID 1/3/4 (template 10 often lacks these).
    DECLARE @MyDetailsRoleTabSourceId INT =
        CASE
            WHEN EXISTS (
                SELECT 1 FROM dbo.TRoleTabDetails
                WHERE Employerid = @RootEmployerId AND MenuId = 5 AND RoleID IN (1, 3, 4)
            ) THEN @RootEmployerId
            ELSE 1
        END;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.TRoleTabDetails
        WHERE Employerid = @ChildEmployerId AND MenuId = 5 AND RoleID IN (1, 3, 4)
    )
    BEGIN
        INSERT INTO dbo.TRoleTabDetails (RoleId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
        SELECT RoleId, MenuId, TabId, @ChildEmployerId, IsEditable, ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE)
        FROM dbo.TRoleTabDetails
        WHERE Employerid = @MyDetailsRoleTabSourceId
          AND MenuId = 5
          AND RoleID IN (1, 3, 4);
    END

    -- Employee Summary search-purpose dropdown.
    IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeSearchPurposeMaster WHERE EmployerId = @ChildEmployerId)
    BEGIN
        DECLARE @SearchPurposeSourceId INT =
            CASE
                WHEN EXISTS (SELECT 1 FROM dbo.TEmployeeSearchPurposeMaster WHERE EmployerId = @RootEmployerId)
                    THEN @RootEmployerId
                ELSE @TemplateEmployerId
            END;
        INSERT INTO dbo.TEmployeeSearchPurposeMaster
            (EmployerId, EmployeeSearchPurpose, IsActive, CreatedBy, CreateDate)
        SELECT @ChildEmployerId, EmployeeSearchPurpose, IsActive, ISNULL(CreatedBy, 1), GETDATE()
        FROM dbo.TEmployeeSearchPurposeMaster
        WHERE EmployerId = @SearchPurposeSourceId;
    END

    -- Keep donor tab off even when child settings already existed from an older seed.
    UPDATE dbo.TCustomerSettings
    SET IsDonorDetails = 0
    WHERE EmployerId = @ChildEmployerId;

    -- Lookup lists
    IF OBJECT_ID('tempdb..#TitleList') IS NOT NULL DROP TABLE #TitleList;
    SELECT ROW_NUMBER() OVER (ORDER BY ID) AS Idx, ID INTO #TitleList
    FROM dbo.TTitle WHERE Employerid = @ChildEmployerId;
    DECLARE @TitleCount INT = (SELECT COUNT(*) FROM #TitleList);

    IF OBJECT_ID('tempdb..#LocationList') IS NOT NULL DROP TABLE #LocationList;
    SELECT ROW_NUMBER() OVER (ORDER BY LocationId) AS Idx, LocationId AS ID INTO #LocationList
    FROM dbo.TLocation WHERE Employerid = @ChildEmployerId;
    DECLARE @LocationCount INT = (SELECT COUNT(*) FROM #LocationList);

    IF OBJECT_ID('tempdb..#EmploymentTypeList') IS NOT NULL DROP TABLE #EmploymentTypeList;
    SELECT ROW_NUMBER() OVER (ORDER BY EmploymentTypeID) AS Idx, EmploymentTypeID AS ID INTO #EmploymentTypeList
    FROM dbo.TMEmploymentTypes WHERE Employerid = @ChildEmployerId;
    DECLARE @EmploymentTypeCount INT = (SELECT COUNT(*) FROM #EmploymentTypeList);

    IF OBJECT_ID('tempdb..#UnitList') IS NOT NULL DROP TABLE #UnitList;
    SELECT ROW_NUMBER() OVER (ORDER BY UnitID) AS Idx, UnitID AS ID INTO #UnitList
    FROM dbo.TOrgHierarchyDetails WHERE Employerid = @ChildEmployerId;
    DECLARE @UnitCount INT = (SELECT COUNT(*) FROM #UnitList);

    IF OBJECT_ID('tempdb..#GradeList') IS NOT NULL DROP TABLE #GradeList;
    SELECT ROW_NUMBER() OVER (ORDER BY GradeId) AS Idx, GradeId AS ID INTO #GradeList
    FROM dbo.TGrade WHERE Employerid = @ChildEmployerId AND IsActive = 1;
    DECLARE @GradeCount INT = (SELECT COUNT(*) FROM #GradeList);

    IF OBJECT_ID('tempdb..#EmpRoleList') IS NOT NULL DROP TABLE #EmpRoleList;
    SELECT ROW_NUMBER() OVER (ORDER BY EmployeeRoleId) AS Idx, EmployeeRoleId AS ID INTO #EmpRoleList
    FROM dbo.TEmployeeRoleMaster WHERE Employerid = @ChildEmployerId AND IsActive = 1;
    DECLARE @EmpRoleCount INT = (SELECT COUNT(*) FROM #EmpRoleList);

    DECLARE @DefaultCalendarId INT =
        (SELECT TOP 1 CalendarId FROM dbo.TCalendarMaster WHERE Employerid = @ChildEmployerId AND IsActive = 1 ORDER BY CalendarId);
    DECLARE @FieldMetadataCount INT = (
        SELECT COUNT(*) FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @ChildEmployerId
    );
    DECLARE @ProfileRoleTabsCount INT = (
        SELECT COUNT(*)
        FROM dbo.TEmployeeRoleUserTabDetails
        WHERE Employerid = @ChildEmployerId
          AND RoleId IN (1, 3, 4)
          AND EmployeeId IS NULL
    );
    DECLARE @MyDetailsRoleTabsCount INT = (
        SELECT COUNT(*)
        FROM dbo.TRoleTabDetails
        WHERE Employerid = @ChildEmployerId
          AND MenuId = 5
          AND RoleId IN (1, 3, 4)
    );

    IF @TitleCount = 0 OR @LocationCount = 0 OR @EmploymentTypeCount = 0 OR @UnitCount = 0
       OR @GradeCount = 0 OR @EmpRoleCount = 0 OR @DefaultCalendarId IS NULL
       OR @FieldMetadataCount = 0 OR @ProfileRoleTabsCount = 0 OR @MyDetailsRoleTabsCount = 0
        THROW 50000, 'Child org is missing required master data after clone.', 1;

    -- 4b. Seed employees (EmploymentNumber = CHc{ordinal}#######)
    IF OBJECT_ID('tempdb..#SeedMap') IS NOT NULL DROP TABLE #SeedMap;
    CREATE TABLE #SeedMap (SeedIndex INT NOT NULL PRIMARY KEY, EmployeeId INT NOT NULL);

    DECLARE @DomainTag VARCHAR(40) = 'perftest' + CAST(@ChildEmployerId AS VARCHAR(10)) + '.test';
    DECLARE @EmpPrefix VARCHAR(10) = 'CH' + CAST(@ChildOrdinal AS VARCHAR(10));
    DECLARE @BatchStart INT = 1, @BatchEnd INT;

    WHILE @BatchStart <= @EmployeesPerChild
    BEGIN
        SET @BatchEnd = CASE WHEN @BatchStart + @BatchSize - 1 > @EmployeesPerChild
                             THEN @EmployeesPerChild ELSE @BatchStart + @BatchSize - 1 END;

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
            CASE WHEN SeedIndex = 1 THEN NULL ELSE ((SeedIndex - 2) / @SpanOfControl) + 1 END AS ParentSeedIndex
        INTO #BatchSeed
        FROM Tally;

        BEGIN TRAN SeedChildBatch;

            MERGE INTO dbo.TEmployee AS tgt
            USING #BatchSeed AS src
            ON 1 = 0
            WHEN NOT MATCHED THEN
                INSERT (FName, LName, EmailID, IsActive, Employerid, EthnicGroup, Gender, DoB, CountryOfEmployment)
                VALUES (
                    'PerfChild' + CAST(@ChildOrdinal AS VARCHAR(10)),
                    'Employee' + CAST(src.SeedIndex AS VARCHAR(10)),
                    'perfchild' + CAST(@ChildOrdinal AS VARCHAR(10)) + '.' + CAST(src.SeedIndex AS VARCHAR(10)) + '@' + @DomainTag,
                    'Y', @ChildEmployerId, 'NA',
                    CASE WHEN src.SeedIndex % 2 = 0 THEN 1 ELSE 2 END,
                    DATEADD(YEAR, -25 - (src.SeedIndex % 20), CAST(GETDATE() AS DATE)),
                    @CountryId
                )
            OUTPUT src.SeedIndex, inserted.EmployeeId INTO #SeedMap (SeedIndex, EmployeeId);

            -- RootEmployerId = perf-test ROOT (not the child Employerid), matching
            -- SP_EC_AddNewEmployee / TEmployerDetails.RootEmployerId for children.
            INSERT INTO dbo.TEmployeeInfo
                (EmployeeId, EmployerID, Title, FunctionalManager, BusinessUnitId, Department,
                 DesignationId, EmploymentNumber, EmploymentTypeID, LocationId, DOJ, Resident, DeductFNPF, ExperienceCategory,
                 Grade, WorkLocation, EmployeeRoleId, CategoryId, Calendarid, NoticePeriod, RootEmployerId)
            SELECT
                m.EmployeeId, @ChildEmployerId, tt.ID,
                -- Child root (#1) reports to the ROOT anchor; others to their in-child parent
                CASE WHEN bs.SeedIndex = 1 THEN @AnchorManagerEmpId ELSE pm.EmployeeId END,
                bu.ID, bu.ID,
                tt.ID,
                @EmpPrefix + RIGHT('0000000' + CAST(bs.SeedIndex AS VARCHAR(10)), 7),
                et.ID, loc.ID,
                DATEADD(DAY, -(bs.SeedIndex % 3650), CAST(GETDATE() AS DATE)),
                1, 1, 'NA',
                gr.ID, wloc.ID, er.ID,
                (bs.SeedIndex % 2) + 1,
                @DefaultCalendarId,
                30,
                @RootEmployerId
            FROM #BatchSeed bs
            JOIN #SeedMap m       ON m.SeedIndex = bs.SeedIndex
            LEFT JOIN #SeedMap pm ON pm.SeedIndex = bs.ParentSeedIndex
            JOIN #TitleList tt          ON tt.Idx  = (bs.SeedIndex % @TitleCount) + 1
            JOIN #LocationList loc      ON loc.Idx = (bs.SeedIndex % @LocationCount) + 1
            JOIN #LocationList wloc     ON wloc.Idx = ((bs.SeedIndex + 1) % @LocationCount) + 1
            JOIN #EmploymentTypeList et ON et.Idx  = (bs.SeedIndex % @EmploymentTypeCount) + 1
            JOIN #UnitList bu           ON bu.Idx  = (bs.SeedIndex % @UnitCount) + 1
            JOIN #GradeList gr          ON gr.Idx  = (bs.SeedIndex % @GradeCount) + 1
            JOIN #EmpRoleList er        ON er.Idx  = (bs.SeedIndex % @EmpRoleCount) + 1;

            INSERT INTO dbo.TORGChart (EmployeeID, ReportsTo, effectivedate)
            SELECT
                m.EmployeeId,
                CASE WHEN bs.SeedIndex = 1 THEN @AnchorManagerEmpId ELSE pm.EmployeeId END,
                CAST(GETDATE() AS DATE)
            FROM #BatchSeed bs
            JOIN #SeedMap m       ON m.SeedIndex = bs.SeedIndex
            LEFT JOIN #SeedMap pm ON pm.SeedIndex = bs.ParentSeedIndex;

        COMMIT TRAN SeedChildBatch;

        SET @BatchStart = @BatchEnd + 1;
    END

    DECLARE @ChildRootEmpId INT = (SELECT EmployeeId FROM #SeedMap WHERE SeedIndex = 1);
    PRINT 'Child Employerid ' + CAST(@ChildEmployerId AS VARCHAR(10))
        + ': seeded ' + CAST(@EmployeesPerChild AS VARCHAR(10))
        + ' employees. Child-root EmployeeId=' + CAST(@ChildRootEmpId AS VARCHAR(10))
        + ' reports to root anchor ' + CAST(@AnchorManagerEmpId AS VARCHAR(10)) + '.';

    DROP TABLE IF EXISTS #BatchSeed, #SeedMap, #TitleList, #LocationList, #EmploymentTypeList,
                         #UnitList, #GradeList, #EmpRoleList;

    FETCH NEXT FROM curChildren INTO @ChildEmployerId, @ChildOrdinal, @ChildCustId;
END
CLOSE curChildren; DEALLOCATE curChildren;

------------------------------------------------------------------------------
-- 5. REFRESH PARENT RolePagesMapping Location/BU FOR ALL EMPLOYEES ACCESS
--    All Employees scopes via FN_LocationBU..., which filters by the viewer's
--    home-employer TRolePagesMapping LocationIds/BusinessUnitIds. Child orgs
--    get new Location/Unit IDs; append them (union with parent) or child staff
--    never appear even when those employers are selected.
------------------------------------------------------------------------------
DECLARE @TreeLocationIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(LocationId AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY LocationId)
        FROM (
            SELECT DISTINCT l.LocationId
            FROM dbo.TLocation l
            WHERE l.Employerid = @RootEmployerId
               OR l.Employerid IN (SELECT ChildEmployerId FROM #ChildOrgs)
        ) locs
    );

DECLARE @TreeBusinessUnitIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(UnitID AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY UnitID)
        FROM (
            SELECT DISTINCT u.UnitID
            FROM dbo.TOrgHierarchyDetails u
            WHERE ISNULL(u.isactive, 'Y') = 'Y'
              AND ISNULL(u.isdelete, 'N') <> 'Y'
              AND (
                    u.Employerid = @RootEmployerId
                    OR u.Employerid IN (SELECT ChildEmployerId FROM #ChildOrgs)
                  )
        ) units
    );

IF @TreeLocationIds IS NOT NULL AND @TreeBusinessUnitIds IS NOT NULL
BEGIN
    UPDATE dbo.TRolePagesMapping
    SET LocationIds = @TreeLocationIds,
        BusinessUnitIds = @TreeBusinessUnitIds
    WHERE Employerid = @RootEmployerId
      AND RoleID IN (1, 3, 4);

    PRINT 'Parent TRolePagesMapping Location/BU refreshed for RoleID 1/3/4 on Employerid '
        + CAST(@RootEmployerId AS VARCHAR(10)) + '.';
END
ELSE
    PRINT 'Skipped parent TRolePagesMapping refresh -- no location/unit rows under employer tree.';

------------------------------------------------------------------------------
-- 6. SUMMARY
------------------------------------------------------------------------------
PRINT '----------------------------------------------------------------------';
PRINT 'Done. Cross-org nested reporting is wired as:';
PRINT '  Root EmployeeId ' + CAST(@AnchorManagerEmpId AS VARCHAR(10))
    + '  <-- ReportsTo <--  each child''s employee #1  <--  rest of child tree';
PRINT 'Log in as the root (C00### / PT0000001 or PT0000002) and open My Details';
PRINT 'Direct/Indirect Reportees (or run Sp_CM_Mydetails_DirectIndirectReports).';
PRINT '----------------------------------------------------------------------';

SELECT c.ChildEmployerId, c.CustId, c.Ordinal,
       (SELECT COUNT(*) FROM dbo.TEmployee e WHERE e.Employerid = c.ChildEmployerId) AS EmployeeCount,
       (SELECT TOP 1 ei.EmployeeId FROM dbo.TEmployeeInfo ei
        WHERE ei.EmployerID = c.ChildEmployerId
        ORDER BY ei.EmployeeId) AS ChildRootEmployeeId
FROM #ChildOrgs c
ORDER BY c.Ordinal;
