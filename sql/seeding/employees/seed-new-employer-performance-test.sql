/* =============================================================================
   Seed a brand-new HRMS tenant with N employees and a nested manager-reporting
   hierarchy, for performance testing of large-employer / deep-nesting
   scenarios (e.g. Sp_CM_Mydetails_DirectIndirectReports*).

   The new tenant's configuration and master data are CLONED from an existing,
   real template employer (@TemplateEmployerId, default 10 - "Test - Cloud
   Customer") rather than synthesized, so employees get realistic variety
   across real Titles/Locations/EmploymentTypes/BusinessUnits instead of one
   constant value each.

   NOT cloned from the template employer, deliberately:
     - Its actual TEmployee rows -- the whole point is NEW synthetic employees,
       not duplicating a real tenant's real people.
     - Its tenant-specific TRoles rows -- test logins reuse the global
       Administrator/Manager/Employee TRoles (RoleID 1/3/4, Employerid=0)
       instead (see section 5). Menu/page/tab access for those roles IS
       cloned per-tenant (TMenuHierarchy / tMenuDetails / TRolePagesMapping /
       TRoleTabDetails) because sp_GetDynamicMenuItems joins them on the
       logged-in user's Employerid.

   WHAT THIS CREATES (one new tenant per run, never touches existing tenants):
     - TEmployerDetails   : 1 row, cloned from @TemplateEmployerId (every
                            setting/feature-flag), with Employerid/EmployerName/
                            ParentEmployerid/RootEmployerId/custid overridden
                            for the new standalone tenant and a fresh EmployerGUID.
     - TCustomerSettings  : 1 row, cloned from @TemplateEmployerId (IsDonorDetails
                            forced off for perf tenants)
     - TEmployeeSearchPurposeMaster : cloned for Employee Summary search dropdown
     - TMEmploymentTypes  : cloned from @TemplateEmployerId (active rows only)
     - TLocation          : cloned from @TemplateEmployerId (active rows only)
     - TTitle             : cloned from @TemplateEmployerId (active rows only)
     - TOrgHierarchyDetails: cloned from @TemplateEmployerId (active rows only),
                            with ParentUnitid remapped to the new tenant's
                            freshly-generated UnitIDs (not left dangling/stale)
     - TLicence           : 1 row, cloned from @TemplateEmployerId, with
                            TotalLicence/EndPeriod bumped to safely cover
                            @EmployeeCount for however long you're testing
     - TGrade / TEmployeeRoleMaster / TCalendarMaster : cloned (identity
                            remapped) so My Details Grade / role / calendar
                            resolve to real names instead of NA
     - TMenuHierarchy / tMenuDetails : cloned from @TemplateEmployerId
     - TRolePagesMapping / TRoleTabDetails : cloned from @TemplateEmployerId
                            for RoleID IN (1,3,4) only (the 3 test-login roles),
                            with LocationIds/BusinessUnitIds rewritten to the
                            new tenant's LocationId / UnitID lists; MenuId=5
                            (My Details tabs) backfilled from employer 1 when
                            the template lacks them for roles 1/3/4
     - TEmployeeDetail_Fields : cloned once only (IF NOT EXISTS) -- duplicates
                            crash PersonalInformation via ToDictionary
     - TRollWisePageAccess : Tabid=59 rows for the 3 test logins so My Details
                            shows the All Employees tab
     - Child orgs          : @ChildOrgCount TEmployerDetails + TCustomerSettings
                            under the new root (Parent/Root = new employer;
                            licence stays on the root)
     - TEmployee          : @EmployeeCount rows
     - TEmployeeInfo      : @EmployeeCount rows. FunctionalManager mirrors the
                            org chart below (per your call to keep both
                            hierarchies identical for this test). Title/
                            BusinessUnitId/Department/EmploymentTypeID/LocationId/
                            Grade/WorkLocation/EmployeeRoleId are round-robined
                            across cloned master rows (WorkLocation = a
                            TLocation.LocationId).
     - TORGChart          : @EmployeeCount rows -- the actual ReportsTo tree
     - TUsers / TUserEmployee : 3 login accounts for a HANDFUL of specific
                            employees only (root, one mid-level manager, one
                            leaf), across Administrator/Manager/Employee
                            TRoles, so you can log into the app UI and check
                            role-gated tabs/pages. PasswordStr is set with the
                            same ConvertStrToBase64(Encrypt(plain)) pipeline as
                            FunctionsController / Login.aspx. UserName /
                            UserEmail are Base64-encoded (EmploymentNumber /
                            EmailID) to match SP_EC_AddNewEmployee -- plaintext
                            emails will not pass SP_LOG_CheckUser. Known
                            plaintext password is printed at the end. NOT every
                            employee gets a login -- see section 5 below.

   TREE SHAPE: a balanced k-ary tree, k = @SpanOfControl (reports per manager).
   Employee #1 is the root; children of node i are ((i-1)*k+2) .. ((i-1)*k+1+k).
   This is computed with pure arithmetic (no recursion), so it costs nothing
   regardless of employee count or depth.

   ONLY reads from -- never writes to -- the template employer. Employerid
   allocation is serialized (UPDLOCK/HOLDLOCK) so this is safe to run
   concurrently with teammates provisioning their own test tenants. Employee
   data is batched (@BatchSize per transaction, DEADLOCK_PRIORITY LOW) to keep
   lock/log footprint short-lived on this shared dev database.

   To remove a tenant created by this script, see:
     seeding/employees/cleanup-perftest-employer.sql

   KNOWN ASSUMPTIONS (verified against IN-SVR-DBDEVHRM/HRM-CL-Prod on 2026-08-05
   -- re-verify if your target DB or @TemplateEmployerId differs):
     - TEmployeeInfo's TRG_TrackEmployeeDesignations / TRG_TrackEmployeeDepartmentHistory
       triggers are currently DISABLED, so no extra history rows are generated.
       If they're enabled on your target DB, expect 2 extra rows/employee.
     - Fn_EncryptData / Sp_OpenEncryptionKeys are no-op stubs in this codebase,
       so PII is written directly to the plaintext columns (FName/LName/DoB/...),
       matching what SP_EC_AddNewEmployee.sql actually does today.
     - TUsers.PasswordStr for the 3 test logins is set with the same pipeline as
       FunctionsController.GeneratePassword / Login.aspx DoWebLogin:
         ConvertStrToBase64( Encrypt( plaintext ) )
       where Encrypt is RijndaelManaged + PasswordDeriveBytes(AppSettings
       SecurityKey). See section 5 -- the synthetic emails are not real
       mailboxes, so reset-password email cannot work; a known password is
       written instead.
   ========================================================================== */

SET NOCOUNT ON;
SET DEADLOCK_PRIORITY LOW;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these, then run the whole script
------------------------------------------------------------------------------
DECLARE @EmployeeCount      INT = 500;  -- total employees to generate
DECLARE @SpanOfControl     INT = 10;       -- reports per manager (tree branching factor)
DECLARE @BatchSize         INT = 20000;    -- rows per batch/transaction
DECLARE @TemplateEmployerId INT = 10;      -- existing employer to clone settings/master-data from
DECLARE @ChildOrgCount     INT = 2;        -- child orgs under the new root (0 = none)

-- Test-login plaintext -- same password used on DEV for manual testing.
-- FIXED so seeded users can log in without a real email / reset-password
-- flow. If you change this, you MUST also recompute @EncryptedPassword in
-- section 5.
DECLARE @PlainPassword VARCHAR(50) = 'welcome123#';

IF @EmployeeCount < 1  THROW 50000, 'EmployeeCount must be >= 1.', 1;
IF @SpanOfControl < 2  THROW 50000, 'SpanOfControl must be >= 2.', 1;
IF @ChildOrgCount < 0  THROW 50000, 'ChildOrgCount must be >= 0.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TemplateEmployerId)
    THROW 50000, 'TemplateEmployerId does not exist in TEmployerDetails.', 1;

DECLARE @EmployerName VARCHAR(100) =
    'PERFTEST ' + CONVERT(VARCHAR(20), @EmployeeCount) + ' EMP ' + CONVERT(VARCHAR(30), GETDATE(), 120);

------------------------------------------------------------------------------
-- 2. PROVISION THE NEW TENANT -- clone TEmployerDetails from the template
------------------------------------------------------------------------------
DECLARE @NewEmployerId INT;
DECLARE @CustId VARCHAR(10);

BEGIN TRAN AllocateEmployerId;

    -- Serialize Employerid allocation so concurrent seed runs never collide
    -- (mirrors SP_AdminORG_AddEmployerDet.sql's own MAX(Employerid)+1 convention).
    SELECT @NewEmployerId = ISNULL(MAX(Employerid), 0) + 1
    FROM dbo.TEmployerDetails WITH (UPDLOCK, HOLDLOCK, ROWLOCK);

    SET @CustId = 'C' + RIGHT('00000' + CAST(@NewEmployerId AS VARCHAR(10)), 5);

    -- Clone every TEmployerDetails column from the template employer except
    -- EmployerGUID (left to its own DEFAULT(newid()) so the new tenant gets a
    -- fresh GUID), overriding the identity/tree/naming columns for a
    -- standalone tenant (RootEmployerId = itself, per SP_AdminORG_AddEmployerDet.sql:397-402).
    DECLARE @ed_cols NVARCHAR(MAX), @ed_select NVARCHAR(MAX);
    SELECT @ed_cols   = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';
    SELECT @ed_select = STRING_AGG(
            CAST(CASE name
                   WHEN 'Employerid'       THEN '@NewEmployerId'
                   WHEN 'EmployerName'     THEN '@EmployerName'
                   WHEN 'ParentEmployerid' THEN '0'
                   WHEN 'RootEmployerId'   THEN '@NewEmployerId'
                   WHEN 'custid'           THEN '@CustId'
                   WHEN 'parentcustid'     THEN 'NULL'
                   ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';

    DECLARE @ed_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TEmployerDetails (' + @ed_cols + N')
SELECT ' + @ed_select + N' FROM dbo.TEmployerDetails WHERE Employerid = @TemplateEmployerId;';
    EXEC sp_executesql @ed_sql,
        N'@NewEmployerId INT, @EmployerName VARCHAR(100), @CustId VARCHAR(10), @TemplateEmployerId INT',
        @NewEmployerId = @NewEmployerId, @EmployerName = @EmployerName, @CustId = @CustId, @TemplateEmployerId = @TemplateEmployerId;

COMMIT TRAN AllocateEmployerId;

PRINT 'New Employerid = ' + CAST(@NewEmployerId AS VARCHAR(10)) + ', custid = ' + @CustId
    + ', cloned from Employerid ' + CAST(@TemplateEmployerId AS VARCHAR(10));

DECLARE @EmployerCountryId INT =
    (SELECT CountryId FROM dbo.TEmployerDetails WHERE Employerid = @NewEmployerId);
IF @EmployerCountryId IS NULL
    SET @EmployerCountryId = 99; -- fallback India; PersonalInformation.aspx Convert.ToInt32(CountryOfEmployment) blows up on NULL/blank

------------------------------------------------------------------------------
-- 3. MASTER DATA CLONED FROM THE TEMPLATE EMPLOYER (only what the FKs
--    below require, plus TLicence so the app doesn't gate on license count)
------------------------------------------------------------------------------

-- 3a. TCustomerSettings: clone the template employer's row (every column
--     except the identity Id), repointing CustomerId/EmployerId/CustName.
--     TCustomerSettings is a very wide table -- STRING_AGG's inputs must be
--     explicitly CAST to a MAX type, or SQL Server errors past 8000 bytes
--     ("STRING_AGG aggregation result exceeded the limit of 8000 bytes").
DECLARE @cs_cols NVARCHAR(MAX), @cs_select NVARCHAR(MAX);
SELECT @cs_cols   = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';
SELECT @cs_select = STRING_AGG(
        CAST(CASE name WHEN 'CustomerId' THEN '@CustId'
                  WHEN 'EmployerId' THEN '@NewEmployerId'
                  WHEN 'CustName'   THEN '@EmployerName'
                  ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';

DECLARE @cs_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TCustomerSettings (' + @cs_cols + N')
SELECT ' + @cs_select + N' FROM dbo.TCustomerSettings WHERE EmployerId = @TemplateEmployerId;';
EXEC sp_executesql @cs_sql,
    N'@CustId VARCHAR(10), @NewEmployerId INT, @EmployerName VARCHAR(100), @TemplateEmployerId INT',
    @CustId = @CustId, @NewEmployerId = @NewEmployerId, @EmployerName = @EmployerName, @TemplateEmployerId = @TemplateEmployerId;

-- Template 10 often has IsDonorDetails=1; that forces Budget Source tab 318 on
-- PersonalInformation and is noise for perf tenants.
UPDATE dbo.TCustomerSettings
SET IsDonorDetails = 0
WHERE EmployerId = @NewEmployerId;

-- Employee Summary search-purpose dropdown (ucEmployeeSummary.bindSearchPurpose).
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeSearchPurposeMaster WHERE EmployerId = @NewEmployerId)
BEGIN
    INSERT INTO dbo.TEmployeeSearchPurposeMaster
        (EmployerId, EmployeeSearchPurpose, IsActive, CreatedBy, CreateDate)
    SELECT @NewEmployerId, EmployeeSearchPurpose, IsActive, ISNULL(CreatedBy, 1), GETDATE()
    FROM dbo.TEmployeeSearchPurposeMaster
    WHERE EmployerId = @TemplateEmployerId;
END

-- 3a-extra. Legacy My Details field metadata.
--     PersonalInformation.aspx builds the Profile Information body from
--     TEmployeeDetail_Fields. Without these rows the page renders an empty shell.
--     MUST be single-clone only: duplicate FieldName/DB_Column rows make
--     MyDetailsFieldHelper.ChangeVisiblityBasedOnParentField.ToDictionary throw
--     and redirect My Details to Oops / Error.aspx.
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @NewEmployerId)
BEGIN
    DECLARE @edf_cols NVARCHAR(MAX), @edf_select NVARCHAR(MAX);
    SELECT @edf_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.TEmployeeDetail_Fields')
      AND is_identity = 0;
    SELECT @edf_select = STRING_AGG(
            CAST(CASE WHEN name = 'EmployerId' THEN '@NewEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)),
            ','
        ) WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.TEmployeeDetail_Fields')
      AND is_identity = 0;

    DECLARE @edf_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TEmployeeDetail_Fields (' + @edf_cols + N')
SELECT ' + @edf_select + N' FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @TemplateEmployerId;';
    EXEC sp_executesql @edf_sql,
        N'@NewEmployerId INT, @TemplateEmployerId INT',
        @NewEmployerId = @NewEmployerId, @TemplateEmployerId = @TemplateEmployerId;
END

-- 3b. TMEmploymentTypes: clone the template employer's active rows.
DECLARE @et_cols NVARCHAR(MAX), @et_select NVARCHAR(MAX);
SELECT @et_cols   = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TMEmploymentTypes') AND is_identity = 0;
SELECT @et_select = STRING_AGG(CAST(CASE WHEN name = 'Employerid' THEN '@NewEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TMEmploymentTypes') AND is_identity = 0;

DECLARE @et_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TMEmploymentTypes (' + @et_cols + N')
SELECT ' + @et_select + N' FROM dbo.TMEmploymentTypes WHERE Employerid = @TemplateEmployerId AND IsActive = 1;';
EXEC sp_executesql @et_sql, N'@NewEmployerId INT, @TemplateEmployerId INT', @NewEmployerId = @NewEmployerId, @TemplateEmployerId = @TemplateEmployerId;

-- 3c. TLocation: clone the template employer's active rows.
DECLARE @loc_cols NVARCHAR(MAX), @loc_select NVARCHAR(MAX);
SELECT @loc_cols   = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TLocation') AND is_identity = 0;
SELECT @loc_select = STRING_AGG(CAST(CASE WHEN name = 'Employerid' THEN '@NewEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TLocation') AND is_identity = 0;

DECLARE @loc_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TLocation (' + @loc_cols + N')
SELECT ' + @loc_select + N' FROM dbo.TLocation WHERE Employerid = @TemplateEmployerId AND IsActive = 1;';
EXEC sp_executesql @loc_sql, N'@NewEmployerId INT, @TemplateEmployerId INT', @NewEmployerId = @NewEmployerId, @TemplateEmployerId = @TemplateEmployerId;

-- 3d. TTitle: clone the template employer's active designations.
DECLARE @tt_cols NVARCHAR(MAX), @tt_select NVARCHAR(MAX);
SELECT @tt_cols   = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TTitle') AND is_identity = 0;
SELECT @tt_select = STRING_AGG(CAST(CASE WHEN name = 'Employerid' THEN '@NewEmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TTitle') AND is_identity = 0;

DECLARE @tt_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TTitle (' + @tt_cols + N')
SELECT ' + @tt_select + N' FROM dbo.TTitle WHERE Employerid = @TemplateEmployerId AND IsActive = ''Y'';';
EXEC sp_executesql @tt_sql, N'@NewEmployerId INT, @TemplateEmployerId INT', @NewEmployerId = @NewEmployerId, @TemplateEmployerId = @TemplateEmployerId;

-- 3e. TOrgHierarchyDetails: clone the template employer's active business
--     units, remapping ParentUnitid so the internal unit-hierarchy tree
--     points at the NEW tenant's freshly-generated UnitIDs -- not the
--     template's original ones, which would otherwise dangle or (worse)
--     coincidentally match some unrelated tenant's real UnitID.
IF OBJECT_ID('tempdb..#UnitSeed') IS NOT NULL DROP TABLE #UnitSeed;
SELECT UnitID AS OldUnitID, ParentUnitid AS OldParentUnitid, UnitName, isactive, isdelete, CreatedBy, CreatedWhen, UpadtedBy, UpdatedWhen
INTO #UnitSeed
FROM dbo.TOrgHierarchyDetails
WHERE Employerid = @TemplateEmployerId AND isactive = 'Y' AND ISNULL(isdelete, 'N') <> 'Y';

IF OBJECT_ID('tempdb..#UnitMap') IS NOT NULL DROP TABLE #UnitMap;
CREATE TABLE #UnitMap (OldUnitID INT NOT NULL PRIMARY KEY, NewUnitID INT NOT NULL);

MERGE INTO dbo.TOrgHierarchyDetails AS tgt
USING #UnitSeed AS src
ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (UnitName, ParentUnitid, Employerid, isactive, isdelete, CreatedBy, CreatedWhen, UpadtedBy, UpdatedWhen)
    VALUES (src.UnitName, NULL, @NewEmployerId, src.isactive, src.isdelete, src.CreatedBy, src.CreatedWhen, src.UpadtedBy, src.UpdatedWhen)
OUTPUT src.OldUnitID, inserted.UnitID INTO #UnitMap (OldUnitID, NewUnitID);

UPDATE t
SET t.ParentUnitid = pm.NewUnitID
FROM dbo.TOrgHierarchyDetails t
JOIN #UnitMap m  ON m.NewUnitID = t.UnitID
JOIN #UnitSeed s ON s.OldUnitID = m.OldUnitID
JOIN #UnitMap pm ON pm.OldUnitID = s.OldParentUnitid
WHERE t.Employerid = @NewEmployerId;

IF OBJECT_ID('tempdb..#UnitSeed') IS NOT NULL DROP TABLE #UnitSeed;

-- 3f. TLicence: clone the template employer's license row so the app doesn't
--     report "license exceeded" for this synthetic tenant. TotalLicence and
--     EndPeriod are bumped rather than copied verbatim, since the template's
--     real limits likely don't cover a large synthetic perf-test run.
DECLARE @LicenceTotal INT  = @EmployeeCount + 1000;
DECLARE @LicenceEnd   DATE = DATEADD(YEAR, 3, CAST(GETDATE() AS DATE));

DECLARE @lic_cols NVARCHAR(MAX), @lic_select NVARCHAR(MAX);
SELECT @lic_cols   = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TLicence') AND is_identity = 0;
SELECT @lic_select = STRING_AGG(
        CAST(CASE name WHEN 'EmployerID'   THEN '@NewEmployerId'
                       WHEN 'TotalLicence' THEN '@LicenceTotal'
                       WHEN 'EndPeriod'    THEN '@LicenceEnd'
                       ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TLicence') AND is_identity = 0;

DECLARE @lic_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TLicence (' + @lic_cols + N')
SELECT ' + @lic_select + N' FROM dbo.TLicence WHERE EmployerID = @TemplateEmployerId;';
EXEC sp_executesql @lic_sql,
    N'@NewEmployerId INT, @LicenceTotal INT, @LicenceEnd DATE, @TemplateEmployerId INT',
    @NewEmployerId = @NewEmployerId, @LicenceTotal = @LicenceTotal, @LicenceEnd = @LicenceEnd, @TemplateEmployerId = @TemplateEmployerId;

-- Round-robin lookup lists so employees get real variety across every
-- Title/Location/EmploymentType/BusinessUnit actually cloned above (instead
-- of one constant value each).
IF OBJECT_ID('tempdb..#TitleList') IS NOT NULL DROP TABLE #TitleList;
SELECT ROW_NUMBER() OVER (ORDER BY ID) AS Idx, ID
INTO #TitleList
FROM dbo.TTitle WHERE Employerid = @NewEmployerId;
DECLARE @TitleCount INT = (SELECT COUNT(*) FROM #TitleList);

IF OBJECT_ID('tempdb..#LocationList') IS NOT NULL DROP TABLE #LocationList;
SELECT ROW_NUMBER() OVER (ORDER BY LocationId) AS Idx, LocationId AS ID
INTO #LocationList
FROM dbo.TLocation WHERE Employerid = @NewEmployerId;
DECLARE @LocationCount INT = (SELECT COUNT(*) FROM #LocationList);

IF OBJECT_ID('tempdb..#EmploymentTypeList') IS NOT NULL DROP TABLE #EmploymentTypeList;
SELECT ROW_NUMBER() OVER (ORDER BY EmploymentTypeID) AS Idx, EmploymentTypeID AS ID
INTO #EmploymentTypeList
FROM dbo.TMEmploymentTypes WHERE Employerid = @NewEmployerId;
DECLARE @EmploymentTypeCount INT = (SELECT COUNT(*) FROM #EmploymentTypeList);

IF OBJECT_ID('tempdb..#UnitList') IS NOT NULL DROP TABLE #UnitList;
SELECT ROW_NUMBER() OVER (ORDER BY UnitID) AS Idx, UnitID AS ID
INTO #UnitList
FROM dbo.TOrgHierarchyDetails WHERE Employerid = @NewEmployerId;
DECLARE @UnitCount INT = (SELECT COUNT(*) FROM #UnitList);

IF @TitleCount = 0          THROW 50000, 'Template employer has no active TTitle rows to clone.', 1;
IF @LocationCount = 0       THROW 50000, 'Template employer has no active TLocation rows to clone.', 1;
IF @EmploymentTypeCount = 0 THROW 50000, 'Template employer has no active TMEmploymentTypes rows to clone.', 1;
IF @UnitCount = 0           THROW 50000, 'Template employer has no active TOrgHierarchyDetails rows to clone.', 1;

-- 3g-extra. Profile lookup masters used by My Details summary:
--     EmpGrade      = TGrade.GradeName WHERE GradeId = TEmployeeInfo.Grade
--     EmpWorkLocation = TLocation.LocationName WHERE LocationId = TEmployeeInfo.WorkLocation
--     (WorkLocation is a LocationId, NOT a separate work-location table.)
--     Fake round-robin ints 1..N do not exist as GradeId/LocationId → "NA" / wrong names.
IF OBJECT_ID('tempdb..#GradeMap') IS NOT NULL DROP TABLE #GradeMap;
CREATE TABLE #GradeMap (OldGradeId INT NOT NULL PRIMARY KEY, NewGradeId INT NOT NULL);

MERGE INTO dbo.TGrade AS tgt
USING (SELECT GradeId, GradeName, GradeDesc, GradeBand, IsActive, CreatedBy
       FROM dbo.TGrade WHERE Employerid = @TemplateEmployerId AND IsActive = 1) AS src
ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (GradeName, GradeDesc, GradeBand, IsActive, CreatedBy, CreatedDate, Employerid)
    VALUES (src.GradeName, src.GradeDesc, src.GradeBand, src.IsActive, src.CreatedBy, GETDATE(), @NewEmployerId)
OUTPUT src.GradeId, inserted.GradeId INTO #GradeMap (OldGradeId, NewGradeId);

IF OBJECT_ID('tempdb..#GradeList') IS NOT NULL DROP TABLE #GradeList;
SELECT ROW_NUMBER() OVER (ORDER BY NewGradeId) AS Idx, NewGradeId AS ID
INTO #GradeList
FROM #GradeMap;
DECLARE @GradeCount INT = (SELECT COUNT(*) FROM #GradeList);

IF OBJECT_ID('tempdb..#EmpRoleMap') IS NOT NULL DROP TABLE #EmpRoleMap;
CREATE TABLE #EmpRoleMap (OldRoleId INT NOT NULL PRIMARY KEY, NewRoleId INT NOT NULL);

MERGE INTO dbo.TEmployeeRoleMaster AS tgt
USING (SELECT EmployeeRoleId, EmployeeRoleName, EmployeeRoleDesc, IsActive, CreatedBy
       FROM dbo.TEmployeeRoleMaster WHERE Employerid = @TemplateEmployerId AND IsActive = 1) AS src
ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (EmployeeRoleName, EmployeeRoleDesc, IsActive, CreatedBy, CreatedDate, Employerid)
    VALUES (src.EmployeeRoleName, src.EmployeeRoleDesc, src.IsActive, src.CreatedBy, GETDATE(), @NewEmployerId)
OUTPUT src.EmployeeRoleId, inserted.EmployeeRoleId INTO #EmpRoleMap (OldRoleId, NewRoleId);

IF OBJECT_ID('tempdb..#EmpRoleList') IS NOT NULL DROP TABLE #EmpRoleList;
SELECT ROW_NUMBER() OVER (ORDER BY NewRoleId) AS Idx, NewRoleId AS ID
INTO #EmpRoleList
FROM #EmpRoleMap;
DECLARE @EmpRoleCount INT = (SELECT COUNT(*) FROM #EmpRoleList);

IF OBJECT_ID('tempdb..#CalendarMap') IS NOT NULL DROP TABLE #CalendarMap;
CREATE TABLE #CalendarMap (OldCalendarId INT NOT NULL PRIMARY KEY, NewCalendarId INT NOT NULL);

MERGE INTO dbo.TCalendarMaster AS tgt
USING (SELECT CalendarId, CalendarName, CalendarDesc, IsActive, CreatedBy,
              AllowHolidayOnWeeklyOff, IsHolidayPrecendenceOverWeeklyOff
       FROM dbo.TCalendarMaster WHERE Employerid = @TemplateEmployerId AND IsActive = 1) AS src
ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (CalendarName, CalendarDesc, IsActive, CreatedBy, CreatedDate, Employerid,
            AllowHolidayOnWeeklyOff, IsHolidayPrecendenceOverWeeklyOff)
    VALUES (src.CalendarName, src.CalendarDesc, src.IsActive, src.CreatedBy, GETDATE(), @NewEmployerId,
            src.AllowHolidayOnWeeklyOff, src.IsHolidayPrecendenceOverWeeklyOff)
OUTPUT src.CalendarId, inserted.CalendarId INTO #CalendarMap (OldCalendarId, NewCalendarId);

DECLARE @DefaultCalendarId INT =
    (SELECT TOP 1 NewCalendarId FROM #CalendarMap ORDER BY NewCalendarId);

IF @GradeCount = 0 THROW 50000, 'Template employer has no active TGrade rows to clone.', 1;
IF @EmpRoleCount = 0 THROW 50000, 'Template employer has no active TEmployeeRoleMaster rows to clone.', 1;
IF @DefaultCalendarId IS NULL THROW 50000, 'Template employer has no active TCalendarMaster rows to clone.', 1;

IF OBJECT_ID('tempdb..#GradeMap') IS NOT NULL DROP TABLE #GradeMap;
IF OBJECT_ID('tempdb..#EmpRoleMap') IS NOT NULL DROP TABLE #EmpRoleMap;
IF OBJECT_ID('tempdb..#CalendarMap') IS NOT NULL DROP TABLE #CalendarMap;

-- 3g. Left-menu access (required by sp_GetDynamicMenuItems):
--     joins TUsers -> TRolePagesMapping -> TMenuHierarchy -> tMenuDetails
--     all filtered by the logged-in user's Employerid. Without these rows the
--     dashboard sidebar is empty even though login succeeds.
--     TRoleTabDetails is cloned too so page-level tabs render for RoleID 1/3/4.
--     My Details section visibility itself is driven by TEmployeeRoleUserTabDetails,
--     so clone the role-level rows for 1/3/4 as well.
--     MenuId values are shared across tenants (composite key with Employerid),
--     so they copy as-is. LocationIds / BusinessUnitIds on TRolePagesMapping
--     are rewritten to this tenant's newly-cloned Location / Unit IDs.
DECLARE @NewLocationIds VARCHAR(MAX) =
    (SELECT STRING_AGG(CAST(ID AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY ID) FROM #LocationList);
DECLARE @NewBusinessUnitIds VARCHAR(MAX) =
    (SELECT STRING_AGG(CAST(ID AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY ID) FROM #UnitList);

INSERT INTO dbo.TMenuHierarchy (MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq)
SELECT MenuId, ParentMenuId, GETDATE(), CreatedBy, @NewEmployerId, parentseq
FROM dbo.TMenuHierarchy
WHERE Employerid = @TemplateEmployerId;

INSERT INTO dbo.tMenuDetails (MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname, TabName)
SELECT MenuId, MenuName, NavigateURL, PageName, ISActive, @NewEmployerId, CreatedBy, GETDATE(), iconname, TabName
FROM dbo.tMenuDetails
WHERE Employerid = @TemplateEmployerId;

INSERT INTO dbo.TRolePagesMapping
    (RoleID, PageId, CreatedBy, CreationDate, Employerid, CreationDateUtcTime, LocationIds, BusinessUnitIds)
SELECT RoleID, PageId, ISNULL(CreatedBy, 1), GETDATE(), @NewEmployerId, GETUTCDATE(),
       @NewLocationIds, @NewBusinessUnitIds
FROM dbo.TRolePagesMapping
WHERE Employerid = @TemplateEmployerId
  AND RoleID IN (1, 3, 4);

INSERT INTO dbo.TRoleTabDetails (RoleId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
SELECT RoleId, MenuId, TabId, @NewEmployerId, IsEditable, ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE)
FROM dbo.TRoleTabDetails
WHERE Employerid = @TemplateEmployerId
  AND RoleID IN (1, 3, 4);

-- Template 10 has MenuId=5 (My Details page tabs) only on custom roles, not
-- global RoleID 1/3/4. Clone those from a healthy employer so Admin/Manager/
-- Employee get in-page tab permissions after login (TAB_BY_ROLE session).
DECLARE @MyDetailsRoleTabSourceId INT = 1;
IF NOT EXISTS (
    SELECT 1 FROM dbo.TRoleTabDetails
    WHERE Employerid = @NewEmployerId AND MenuId = 5 AND RoleID IN (1, 3, 4)
)
BEGIN
    INSERT INTO dbo.TRoleTabDetails (RoleId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
    SELECT RoleId, MenuId, TabId, @NewEmployerId, IsEditable, ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE)
    FROM dbo.TRoleTabDetails
    WHERE Employerid = @MyDetailsRoleTabSourceId
      AND MenuId = 5
      AND RoleID IN (1, 3, 4);
END

INSERT INTO dbo.TEmployeeRoleUserTabDetails
    (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
     CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
SELECT RoleId, NULL, ModuleSectionId, ModuleTabId, @NewEmployerId, IsEditable,
       ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(), GETDATE(), ISNULL(UpdatedBy, ISNULL(CreatedBy, 1)), GETUTCDATE()
FROM dbo.TEmployeeRoleUserTabDetails
WHERE Employerid = @TemplateEmployerId
  AND RoleID IN (1, 3, 4)
  AND EmployeeId IS NULL;

-- Template tenants often only have RoleId=1 (or tenant-specific roles like
-- 423/467) for profile sections. Test logins use global RoleID 1/3/4, so
-- copy Administrator section rows onto Manager (3) and Employee (4) when missing.
INSERT INTO dbo.TEmployeeRoleUserTabDetails
    (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
     CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
SELECT r.RoleId, NULL, src.ModuleSectionId, src.ModuleTabId, @NewEmployerId, src.IsEditable,
       ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(),
       GETDATE(), ISNULL(src.UpdatedBy, ISNULL(src.CreatedBy, 1)), GETUTCDATE()
FROM dbo.TEmployeeRoleUserTabDetails src
CROSS JOIN (SELECT 3 AS RoleId UNION ALL SELECT 4) r
WHERE src.Employerid = @NewEmployerId
  AND src.RoleId = 1
  AND src.EmployeeId IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.TEmployeeRoleUserTabDetails x
      WHERE x.Employerid = @NewEmployerId
        AND x.RoleId = r.RoleId
        AND x.EmployeeId IS NULL
        AND x.ModuleSectionId = src.ModuleSectionId
        AND x.ModuleTabId = src.ModuleTabId
  );

DECLARE @MenuHierarchyCount INT = (SELECT COUNT(*) FROM dbo.TMenuHierarchy WHERE Employerid = @NewEmployerId);
DECLARE @MenuDetailsCount   INT = (SELECT COUNT(*) FROM dbo.tMenuDetails WHERE Employerid = @NewEmployerId);
DECLARE @RolePagesCount     INT = (SELECT COUNT(*) FROM dbo.TRolePagesMapping WHERE Employerid = @NewEmployerId AND RoleID IN (1,3,4));
DECLARE @RoleTabsCount      INT = (SELECT COUNT(*) FROM dbo.TRoleTabDetails WHERE Employerid = @NewEmployerId AND RoleID IN (1,3,4));
DECLARE @MyDetailsRoleTabsCount INT = (
    SELECT COUNT(*) FROM dbo.TRoleTabDetails
    WHERE Employerid = @NewEmployerId AND MenuId = 5 AND RoleID IN (1, 3, 4)
);
DECLARE @FieldMetadataCount INT = (SELECT COUNT(*) FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @NewEmployerId);
DECLARE @SearchPurposeCount INT = (SELECT COUNT(*) FROM dbo.TEmployeeSearchPurposeMaster WHERE EmployerId = @NewEmployerId);
DECLARE @ProfileRoleTabsCount INT = (
    SELECT COUNT(*)
    FROM dbo.TEmployeeRoleUserTabDetails
    WHERE Employerid = @NewEmployerId
      AND RoleID IN (1, 3, 4)
      AND EmployeeId IS NULL
);

IF @MenuHierarchyCount = 0 THROW 50000, 'Template employer has no TMenuHierarchy rows to clone -- left menu would be empty.', 1;
IF @MenuDetailsCount   = 0 THROW 50000, 'Template employer has no tMenuDetails rows to clone -- left menu would be empty.', 1;
IF @RolePagesCount     = 0 THROW 50000, 'Template employer has no TRolePagesMapping rows for RoleID 1/3/4 -- left menu would be empty.', 1;
IF @MyDetailsRoleTabsCount = 0 THROW 50000, 'No MenuId=5 TRoleTabDetails for RoleID 1/3/4 -- My Details page tabs would be empty (employer 1 should have them).', 1;
IF @FieldMetadataCount = 0 THROW 50000, 'Template employer has no TEmployeeDetail_Fields rows -- legacy My Details sections would be empty.', 1;
IF @ProfileRoleTabsCount = 0 THROW 50000, 'Template employer has no TEmployeeRoleUserTabDetails rows for RoleID 1/3/4 -- My Details sections would be empty.', 1;

PRINT 'Master data cloned from Employerid ' + CAST(@TemplateEmployerId AS VARCHAR(10)) + ':'
    + ' Titles=' + CAST(@TitleCount AS VARCHAR(10))
    + ', Locations=' + CAST(@LocationCount AS VARCHAR(10))
    + ', EmploymentTypes=' + CAST(@EmploymentTypeCount AS VARCHAR(10))
    + ', BusinessUnits=' + CAST(@UnitCount AS VARCHAR(10))
    + ', Grades=' + CAST(@GradeCount AS VARCHAR(10))
    + ', EmpRoles=' + CAST(@EmpRoleCount AS VARCHAR(10))
    + ', CalendarId=' + CAST(@DefaultCalendarId AS VARCHAR(10))
    + ', MenuHierarchy=' + CAST(@MenuHierarchyCount AS VARCHAR(10))
    + ', MenuDetails=' + CAST(@MenuDetailsCount AS VARCHAR(10))
    + ', RolePages(1/3/4)=' + CAST(@RolePagesCount AS VARCHAR(10))
    + ', RoleTabs(1/3/4)=' + CAST(@RoleTabsCount AS VARCHAR(10))
    + ', MyDetailsTabs Menu5(1/3/4)=' + CAST(@MyDetailsRoleTabsCount AS VARCHAR(10))
    + ', FieldMetadata=' + CAST(@FieldMetadataCount AS VARCHAR(10))
    + ', SearchPurpose=' + CAST(@SearchPurposeCount AS VARCHAR(10))
    + ', ProfileRoleTabs(1/3/4)=' + CAST(@ProfileRoleTabsCount AS VARCHAR(10));

IF OBJECT_ID('tempdb..#UnitMap') IS NOT NULL DROP TABLE #UnitMap;

------------------------------------------------------------------------------
-- 4. BULK-GENERATE EMPLOYEES + K-ARY REPORTING TREE
--    (functional-manager hierarchy mirrors the org chart, per your call)
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#SeedMap') IS NOT NULL DROP TABLE #SeedMap;
CREATE TABLE #SeedMap (SeedIndex INT NOT NULL PRIMARY KEY, EmployeeId INT NOT NULL);

DECLARE @DomainTag  VARCHAR(40) = 'perftest' + CAST(@NewEmployerId AS VARCHAR(10)) + '.test';
DECLARE @BatchStart INT = 1;
DECLARE @BatchEnd   INT;

WHILE @BatchStart <= @EmployeeCount
BEGIN
    SET @BatchEnd = CASE WHEN @BatchStart + @BatchSize - 1 > @EmployeeCount
                         THEN @EmployeeCount ELSE @BatchStart + @BatchSize - 1 END;

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

    BEGIN TRAN SeedBatch;

        -- 4a. TEmployee -- capture SeedIndex -> new EmployeeId via MERGE's OUTPUT.
        --     (A plain INSERT...SELECT...OUTPUT can't expose source columns;
        --     MERGE with an always-false match condition forces every row
        --     through WHEN NOT MATCHED THEN INSERT while OUTPUT can still see
        --     the source alias -- the standard trick for this.)
        --     CountryOfEmployment is REQUIRED: PersonalInformation.aspx BindEmpSummary
        --     does Convert.ToInt32(CountryOfEmployment) and throws
        --     "Input string was not in a correct format" when it is NULL/blank
        --     (DBNull.ToString() => "").
        MERGE INTO dbo.TEmployee AS tgt
        USING #BatchSeed AS src
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (FName, LName, EmailID, IsActive, Employerid, EthnicGroup, Gender, DoB, CountryOfEmployment)
            VALUES (
                'PerfTest',
                'Employee' + CAST(src.SeedIndex AS VARCHAR(10)),
                'perftest.' + CAST(src.SeedIndex AS VARCHAR(10)) + '@' + @DomainTag,
                'Y', @NewEmployerId, 'NA',
                CASE WHEN src.SeedIndex % 2 = 0 THEN 1 ELSE 2 END,
                DATEADD(YEAR, -25 - (src.SeedIndex % 20), CAST(GETDATE() AS DATE)),
                @EmployerCountryId
            )
        OUTPUT src.SeedIndex, inserted.EmployeeId INTO #SeedMap (SeedIndex, EmployeeId);

        -- 4b. TEmployeeInfo -- one row per employee; FunctionalManager = same
        --     manager as TORGChart.ReportsTo (mirrored hierarchy, per your call).
        --     Title/BusinessUnitId/Department/EmploymentTypeID/LocationId/
        --     Grade/WorkLocation/EmployeeRoleId are round-robined across REAL
        --     cloned master rows (Grade → TGrade, WorkLocation → TLocation).
        --     Calendarid is the first cloned calendar for every employee.
        -- RootEmployerId REQUIRED (mirrors SP_EC_AddNewEmployee): cross-reporting
        -- SPs filter TEmployeeInfo.RootEmployerId; NULL breaks manager lists /
        -- My Details scope for IsCrossReportingApplicable tenants.
        INSERT INTO dbo.TEmployeeInfo
            (EmployeeId, EmployerID, Title, FunctionalManager, BusinessUnitId, Department,
             DesignationId, EmploymentNumber, EmploymentTypeID, LocationId, DOJ, Resident, DeductFNPF, ExperienceCategory,
             Grade, WorkLocation, EmployeeRoleId, CategoryId, Calendarid, NoticePeriod, RootEmployerId)
        SELECT
            m.EmployeeId, @NewEmployerId, tt.ID, pm.EmployeeId, bu.ID, bu.ID,
            tt.ID,
            'PT' + RIGHT('0000000' + CAST(bs.SeedIndex AS VARCHAR(10)), 7),
            et.ID, loc.ID,
            DATEADD(DAY, -(bs.SeedIndex % 3650), CAST(GETDATE() AS DATE)),
            1, 1, 'NA',
            gr.ID,                         -- Grade:          real TGrade.GradeId
            wloc.ID,                       -- WorkLocation:   real TLocation.LocationId
            er.ID,                         -- EmployeeRoleId: real TEmployeeRoleMaster id
            (bs.SeedIndex % 2) + 1,        -- CategoryId:     soft attribute (no FK)
            @DefaultCalendarId,
            30,
            @NewEmployerId                 -- RootEmployerId: standalone root = self
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

        -- 4c. TORGChart -- the actual manager-reporting tree.
        INSERT INTO dbo.TORGChart (EmployeeID, ReportsTo, effectivedate)
        SELECT m.EmployeeId, pm.EmployeeId, CAST(GETDATE() AS DATE)
        FROM #BatchSeed bs
        JOIN #SeedMap m       ON m.SeedIndex = bs.SeedIndex
        LEFT JOIN #SeedMap pm ON pm.SeedIndex = bs.ParentSeedIndex;

    COMMIT TRAN SeedBatch;

    PRINT 'Seeded employees ' + CAST(@BatchStart AS VARCHAR(10)) + '..' + CAST(@BatchEnd AS VARCHAR(10))
        + ' of ' + CAST(@EmployeeCount AS VARCHAR(10));

    SET @BatchStart = @BatchEnd + 1;
END

IF OBJECT_ID('tempdb..#BatchSeed') IS NOT NULL DROP TABLE #BatchSeed;
IF OBJECT_ID('tempdb..#TitleList') IS NOT NULL DROP TABLE #TitleList;
IF OBJECT_ID('tempdb..#LocationList') IS NOT NULL DROP TABLE #LocationList;
IF OBJECT_ID('tempdb..#EmploymentTypeList') IS NOT NULL DROP TABLE #EmploymentTypeList;
IF OBJECT_ID('tempdb..#UnitList') IS NOT NULL DROP TABLE #UnitList;
IF OBJECT_ID('tempdb..#GradeList') IS NOT NULL DROP TABLE #GradeList;
IF OBJECT_ID('tempdb..#EmpRoleList') IS NOT NULL DROP TABLE #EmpRoleList;

------------------------------------------------------------------------------
-- 5. TEST LOGIN ACCOUNTS -- a HANDFUL of specific employees only, not everyone.
--    Reuses the shared, global (Employerid=0) TRoles rows -- Administrator/
--    Manager/Employee -- the same convention SP_EC_AddNewEmployee.sql uses for
--    its default 'Employee' role, so no new TRoles rows are needed.
--
--    PasswordStr pipeline (same as FunctionsController.GeneratePassword and
--    Login.aspx DoWebLogin):
--      PasswordStr = ConvertStrToBase64( Encrypt( @PlainPassword ) )
--    where Encrypt = RijndaelManaged + PasswordDeriveBytes(SecurityKey) and
--    ConvertStrToBase64 = ASCII bytes of the Encrypt() Base64 string, then
--    Base64 again (dbo.FN_ConvertSTRToBase64).
--
--    PasswordDeriveBytes / RijndaelManaged are .NET-only -- T-SQL has no
--    equivalent -- so the Encrypt() intermediate is precomputed with the
--    shared DEV/UAT/PROD SecurityKey from Web.config:
--      SecurityKey = 6C96C934-24C3-4A94-9BE6-93F9782FB8DB
--    To regenerate after changing @PlainPassword or SecurityKey, run:
--      Encrypt(@PlainPassword) in .NET (see EncryptionDecryption.Encrypt),
--      then set @EncryptedPassword below to that Base64 result.
------------------------------------------------------------------------------
DECLARE @RootEmpId    INT, @ManagerEmpId INT, @LeafEmpId INT;
SELECT @RootEmpId    = EmployeeId FROM #SeedMap WHERE SeedIndex = 1;
SELECT @ManagerEmpId = EmployeeId FROM #SeedMap WHERE SeedIndex = 2;                  -- root's first direct report -- has its own reports for any realistic @EmployeeCount
SELECT @LeafEmpId    = EmployeeId FROM #SeedMap WHERE SeedIndex = @EmployeeCount;     -- the last employee generated -- always a leaf (highest SeedIndex has no children)

-- security.Encrypt(@PlainPassword) result for SecurityKey above and plaintext
-- 'welcome123#'. Verified to round-trip via EncryptionDecryption.Decrypt after
-- ConvertBase64ToStr.
DECLARE @EncryptedPassword VARCHAR(200) = 'S9nUyydGXukVrOrgZ6bpjHQ04Wn389sokdORE3OmgWY=';
DECLARE @PasswordStr VARCHAR(200);

IF OBJECT_ID(N'dbo.FN_ConvertSTRToBase64', N'FN') IS NOT NULL
    SET @PasswordStr = dbo.FN_ConvertSTRToBase64(@EncryptedPassword);
ELSE
    -- Fallback = StringHelper.ConvertStrToBase64(@EncryptedPassword), same value
    SET @PasswordStr = 'UzluVXl5ZEdYdWtWck9yZ1o2YnBqSFEwNFduMzg5c29rZE9SRTNPbWdXWT0=';

IF OBJECT_ID('tempdb..#TestLogins') IS NOT NULL DROP TABLE #TestLogins;
CREATE TABLE #TestLogins (EmployeeId INT NOT NULL, RoleID INT NOT NULL, RoleLabel VARCHAR(20) NOT NULL);
INSERT INTO #TestLogins (EmployeeId, RoleID, RoleLabel) VALUES (@RootEmpId, 1, 'Administrator');
IF @ManagerEmpId IS NOT NULL AND @ManagerEmpId <> @RootEmpId
    INSERT INTO #TestLogins (EmployeeId, RoleID, RoleLabel) VALUES (@ManagerEmpId, 3, 'Manager');
IF @LeafEmpId IS NOT NULL AND @LeafEmpId NOT IN (SELECT EmployeeId FROM #TestLogins)
    INSERT INTO #TestLogins (EmployeeId, RoleID, RoleLabel) VALUES (@LeafEmpId, 4, 'Employee');

DECLARE @tu_EmployeeId INT, @tu_RoleId INT, @tu_UserId INT;
DECLARE curLogins CURSOR LOCAL FAST_FORWARD FOR SELECT EmployeeId, RoleID FROM #TestLogins;
OPEN curLogins;
FETCH NEXT FROM curLogins INTO @tu_EmployeeId, @tu_RoleId;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- IsForceToChangePassword = 'N' so perf-test logins work immediately with
    -- the known @PlainPassword (production AddNewEmployee sets 'Y' because it
    -- emails a one-time password to a real mailbox).
    --
    -- UserName / UserEmail MUST be Base64-encoded (same as SP_EC_AddNewEmployee):
    -- Login.aspx EMAILID mode does ConvertStrToBase64(email) before CheckUser,
    -- and SP_LOG_CheckUser compares via FN_ConvertBase64ToSTR(UserEmail).
    -- Plaintext emails will never match -- that is why seeded logins failed.
    INSERT INTO dbo.TUsers (UserName, UserEmail, PasswordStr, RoleID, IsActive, Employerid, UserType, IsForceToChangePassword, PasswordChangedDate)
    SELECT
        dbo.FN_ConvertSTRToBase64(ei.EmploymentNumber),
        dbo.FN_ConvertSTRToBase64(e.EmailID),
        @PasswordStr,
        @tu_RoleId,
        'Y',
        @NewEmployerId,
        'E',
        'N',
        GETDATE()
    FROM dbo.TEmployee e
    JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
    WHERE e.EmployeeId = @tu_EmployeeId;
    SET @tu_UserId = SCOPE_IDENTITY();

    INSERT INTO dbo.TUserEmployee (UserID, EmployeeID) VALUES (@tu_UserId, @tu_EmployeeId);

    FETCH NEXT FROM curLogins INTO @tu_EmployeeId, @tu_RoleId;
END
CLOSE curLogins; DEALLOCATE curLogins;

PRINT 'Test logins created. Password (plaintext) = ' + @PlainPassword;
PRINT 'DEV LoginWith = EMPNO -- use EmploymentNumber as User Name (NOT the email).';
SELECT tl.RoleLabel, tl.EmployeeId, u.UserID,
       ei.EmploymentNumber AS LoginUserName_EMPNO,
       e.EmailID AS Email_for_reference_only,
       @CustId AS CustomerNumber,
       @PlainPassword AS LoginPassword
FROM #TestLogins tl
JOIN dbo.TUserEmployee ue ON ue.EmployeeID = tl.EmployeeId
JOIN dbo.TUsers u ON u.UserID = ue.UserID
JOIN dbo.TEmployee e ON e.EmployeeId = tl.EmployeeId
JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = tl.EmployeeId
WHERE u.Employerid = @NewEmployerId;

-- 5a-extra. My Details subsection access is user-specific (TUserTabDetails
--      MenuId=5), not role-based in the template tenant. Copy those rows from
--      a template user of the same role onto each seeded perf-test login.
IF OBJECT_ID('tempdb..#TemplateMyDetailsUsers') IS NOT NULL DROP TABLE #TemplateMyDetailsUsers;
SELECT u.RoleID, MIN(u.UserID) AS SourceUserID
INTO #TemplateMyDetailsUsers
FROM dbo.TUsers u
JOIN dbo.TUserTabDetails utd ON utd.UserId = u.UserID
WHERE u.Employerid = @TemplateEmployerId
  AND u.RoleID IN (1, 3, 4)
  AND utd.MenuId = 5
GROUP BY u.RoleID;

INSERT INTO dbo.TUserTabDetails (UserId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
SELECT targetU.UserID, src.MenuId, src.TabId, @NewEmployerId, src.IsEditable, ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE)
FROM #TestLogins tl
JOIN dbo.TUserEmployee tue ON tue.EmployeeID = tl.EmployeeId
JOIN dbo.TUsers targetU ON targetU.UserID = tue.UserID AND targetU.Employerid = @NewEmployerId
JOIN #TemplateMyDetailsUsers map ON map.RoleID = tl.RoleID
JOIN dbo.TUserTabDetails src ON src.UserId = map.SourceUserID
WHERE src.MenuId = 5;

PRINT 'TUserTabDetails cloned for My Details (MenuId=5): ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 5b. All Employees tab (My Details) -- gated by SP_GetActiveInactiveFlagForRole
--     reading TRollWisePageAccess for Tabid=59 (My Details) with ActiveFlag/
--     InActiveFlag = 'Y' AND the logged-in EmployeeId listed in EmployeeIds.
INSERT INTO dbo.TRollWisePageAccess
    (RoleId, ActiveFlag, InActiveFlag, EmployerId, CreatedBy, CreatedDate, Tabid, Menuid, CreationDateUtcTime, EmployeeIds)
SELECT tl.RoleID, 'Y', 'Y', @NewEmployerId, 1, GETDATE(), 59, 5, GETUTCDATE(),
       CAST(tl.EmployeeId AS VARCHAR(20))
FROM #TestLogins tl;

PRINT 'TRollWisePageAccess rows for All Employees tab (Tabid=59): '
    + CAST(@@ROWCOUNT AS VARCHAR(10));

------------------------------------------------------------------------------
-- 5c. CHILD ORGANIZATIONS -- under the new root, for org-switcher /
--     IsCrossReportingApplicable scenarios. Licence stays on the root.
------------------------------------------------------------------------------
IF @ChildOrgCount > 0
BEGIN
    UPDATE dbo.TEmployerDetails
    SET IsCrossReportingApplicable = 'Y'
    WHERE Employerid = @NewEmployerId;

    DECLARE @ChildIdx INT = 1;
    DECLARE @ChildEmployerId INT, @ChildCustId VARCHAR(10), @ChildName VARCHAR(100);
    DECLARE @ed_child_cols NVARCHAR(MAX), @ed_child_select NVARCHAR(MAX), @ed_child_sql NVARCHAR(MAX);
    DECLARE @cs_child_cols NVARCHAR(MAX), @cs_child_select NVARCHAR(MAX), @cs_child_sql NVARCHAR(MAX);

    SELECT @ed_child_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';

    WHILE @ChildIdx <= @ChildOrgCount
    BEGIN
        BEGIN TRAN AllocateChildOrg;

            SELECT @ChildEmployerId = ISNULL(MAX(Employerid), 0) + 1
            FROM dbo.TEmployerDetails WITH (UPDLOCK, HOLDLOCK, ROWLOCK);

            SET @ChildCustId = 'C' + RIGHT('00000' + CAST(@ChildEmployerId AS VARCHAR(10)), 5);
            SET @ChildName = LEFT(@EmployerName + ' CHILD ' + CAST(@ChildIdx AS VARCHAR(10)), 100);

            SELECT @ed_child_select = STRING_AGG(
                    CAST(CASE name
                           WHEN 'Employerid'       THEN '@ChildEmployerId'
                           WHEN 'EmployerName'     THEN '@ChildName'
                           WHEN 'ParentEmployerid' THEN '@NewEmployerId'
                           WHEN 'RootEmployerId'   THEN '@NewEmployerId'
                           WHEN 'custid'           THEN '@ChildCustId'
                           WHEN 'parentcustid'     THEN 'NULL'
                           WHEN 'IsCrossReportingApplicable' THEN '''Y'''
                           ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';

            SET @ed_child_sql = N'INSERT INTO dbo.TEmployerDetails (' + @ed_child_cols + N')
SELECT ' + @ed_child_select + N' FROM dbo.TEmployerDetails WHERE Employerid = @NewEmployerId;';
            EXEC sp_executesql @ed_child_sql,
                N'@ChildEmployerId INT, @ChildName VARCHAR(100), @NewEmployerId INT, @ChildCustId VARCHAR(10)',
                @ChildEmployerId = @ChildEmployerId, @ChildName = @ChildName,
                @NewEmployerId = @NewEmployerId, @ChildCustId = @ChildCustId;

            SELECT @cs_child_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';
            SELECT @cs_child_select = STRING_AGG(
                    CAST(CASE name WHEN 'CustomerId' THEN '@ChildCustId'
                              WHEN 'EmployerId' THEN '@ChildEmployerId'
                              WHEN 'CustName'   THEN '@ChildName'
                              ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';

            SET @cs_child_sql = N'INSERT INTO dbo.TCustomerSettings (' + @cs_child_cols + N')
SELECT ' + @cs_child_select + N' FROM dbo.TCustomerSettings WHERE EmployerId = @NewEmployerId;';
            EXEC sp_executesql @cs_child_sql,
                N'@ChildCustId VARCHAR(10), @ChildEmployerId INT, @ChildName VARCHAR(100), @NewEmployerId INT',
                @ChildCustId = @ChildCustId, @ChildEmployerId = @ChildEmployerId,
                @ChildName = @ChildName, @NewEmployerId = @NewEmployerId;

        COMMIT TRAN AllocateChildOrg;

        PRINT 'Child org #' + CAST(@ChildIdx AS VARCHAR(10))
            + ': Employerid=' + CAST(@ChildEmployerId AS VARCHAR(10))
            + ', custid=' + @ChildCustId
            + ', ParentEmployerid=' + CAST(@NewEmployerId AS VARCHAR(10));

        SET @ChildIdx += 1;
    END
END

DECLARE @AccessibleEmployerIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(Employerid AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY Employerid)
        FROM (
            SELECT @NewEmployerId AS Employerid
            UNION ALL
            SELECT Employerid
            FROM dbo.TEmployerDetails
            WHERE ParentEmployerid = @NewEmployerId
        ) AS accessible
    );

UPDATE u
SET u.IsGlobalAccess = 'Y',
    u.EmployerIds = @AccessibleEmployerIds
FROM dbo.TUsers u
JOIN dbo.TUserEmployee ue ON ue.UserID = u.UserID
WHERE ue.EmployeeID = @RootEmpId
  AND u.Employerid = @NewEmployerId
  AND u.RoleID = 1;

PRINT 'Root login global access employers: ' + ISNULL(@AccessibleEmployerIds, CAST(@NewEmployerId AS VARCHAR(20)));

IF OBJECT_ID('tempdb..#TestLogins') IS NOT NULL DROP TABLE #TestLogins;
IF OBJECT_ID('tempdb..#SeedMap')    IS NOT NULL DROP TABLE #SeedMap;

------------------------------------------------------------------------------
-- 6. SUMMARY
------------------------------------------------------------------------------
DECLARE @DepthWalk INT = @EmployeeCount, @Depth INT = 0;
WHILE @DepthWalk > 1
BEGIN
    SET @DepthWalk = ((@DepthWalk - 2) / @SpanOfControl) + 1;
    SET @Depth += 1;
END

PRINT '----------------------------------------------------------------------';
PRINT 'Done.';
PRINT 'Employerid       : ' + CAST(@NewEmployerId AS VARCHAR(10)) + ' (custid ' + @CustId + ', cloned from ' + CAST(@TemplateEmployerId AS VARCHAR(10)) + ')';
PRINT 'Employees created: ' + CAST(@EmployeeCount AS VARCHAR(10));
PRINT 'Span of control  : ' + CAST(@SpanOfControl AS VARCHAR(10));
PRINT 'Max tree depth   : ' + CAST(@Depth AS VARCHAR(10)) + ' levels below the root';
PRINT 'Root EmployeeId  : ' + CAST(@RootEmpId AS VARCHAR(10)) + ' (EmailID perftest.1@' + @DomainTag + ')';
PRINT 'Test logins      : see the RoleLabel / LoginUserName_EMPNO rows printed above';
PRINT 'How to sign in   : Customer Number = ' + @CustId
    + ', User Name = PT0000001 (root) / PT0000002 (manager) / PT'
    + RIGHT('0000000' + CAST(@EmployeeCount AS VARCHAR(10)), 7)
    + ' (leaf), Password = ' + @PlainPassword;
PRINT 'All Employees tab: enabled via TRollWisePageAccess (Tabid=59) for the 3 test logins';
PRINT 'Child orgs       : ' + CAST(@ChildOrgCount AS VARCHAR(10))
    + ' under Employerid ' + CAST(@NewEmployerId AS VARCHAR(10))
    + ' (RootEmployerId=parent; licence stays on root)';
PRINT 'NOTE             : DEV LoginWith is EMPNO -- do NOT use the synthetic email as User Name';
PRINT 'NOTE             : Root employee has no FunctionalManager/ReportsTo (expected for tree root)';
PRINT '----------------------------------------------------------------------';

SELECT COUNT(*) AS TEmployee_RowsForTenant   FROM dbo.TEmployee   WHERE Employerid = @NewEmployerId;
SELECT COUNT(*) AS TEmployeeInfo_RowsForTenant FROM dbo.TEmployeeInfo WHERE EmployerID = @NewEmployerId;
SELECT COUNT(*) AS TORGChart_RowsForTenant
FROM dbo.TORGChart oc
JOIN dbo.TEmployee e ON e.EmployeeId = oc.EmployeeID
WHERE e.Employerid = @NewEmployerId;

-- Use this Employerid to drive the reporting-hierarchy perf tests, e.g.:
--   EXEC Sp_CM_Mydetails_DirectIndirectReports_Count
--        @EmployeeId = @RootEmpId, @RankLevel = -3, @EmployerId = @NewEmployerId;
