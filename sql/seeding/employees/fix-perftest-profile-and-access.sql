/* =============================================================================
  Repair an existing perf-test tenant (default C00232 / Employerid 232) for:
    1) Legacy My Details field metadata missing (empty profile body)
    2) My Details profile fields that show NA / wrong names because Grade /
       WorkLocation / EmployeeRoleId / DesignationId were incomplete
    3) Missing All Employees tab (needs TRollWisePageAccess Tabid=59)
    4) Optional child organizations under the root

   Safe to re-run: clones masters only when the tenant has none; rewrites
   TEmployeeInfo Grade/WorkLocation/EmployeeRoleId/Calendarid; upserts
   TRollWisePageAccess for the 3 test logins; creates child orgs only if
   none exist yet under the parent.

   Edit @CustId / @TemplateEmployerId / @ChildOrgCount, then run.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @CustId             VARCHAR(10) = 'C00232';
DECLARE @TemplateEmployerId INT         = 10;
DECLARE @ChildOrgCount      INT         = 2;

DECLARE @EmployerId INT =
    (SELECT Employerid FROM dbo.TEmployerDetails WHERE custid = @CustId);

IF @EmployerId IS NULL
    THROW 50000, 'Employer not found for that custid.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TemplateEmployerId)
    THROW 50000, 'TemplateEmployerId does not exist.', 1;

------------------------------------------------------------------------------
-- 1. Clone legacy My Details field metadata if missing
------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @EmployerId)
BEGIN
    DECLARE @edf_cols NVARCHAR(MAX), @edf_select NVARCHAR(MAX);
    SELECT @edf_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.TEmployeeDetail_Fields')
      AND is_identity = 0;
    SELECT @edf_select = STRING_AGG(
            CAST(CASE WHEN name = 'EmployerId' THEN '@EmployerId' ELSE QUOTENAME(name) END AS NVARCHAR(MAX)),
            ','
        ) WITHIN GROUP (ORDER BY column_id)
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.TEmployeeDetail_Fields')
      AND is_identity = 0;

    DECLARE @edf_sql NVARCHAR(MAX) = N'INSERT INTO dbo.TEmployeeDetail_Fields (' + @edf_cols + N')
SELECT ' + @edf_select + N' FROM dbo.TEmployeeDetail_Fields WHERE EmployerId = @TemplateEmployerId;';
    EXEC sp_executesql @edf_sql,
        N'@EmployerId INT, @TemplateEmployerId INT',
        @EmployerId = @EmployerId, @TemplateEmployerId = @TemplateEmployerId;

    PRINT 'Cloned TEmployeeDetail_Fields: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
END

------------------------------------------------------------------------------
-- 2. Clone Grade / EmployeeRole / Calendar masters if missing
------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.TGrade WHERE Employerid = @EmployerId AND IsActive = 1)
BEGIN
    INSERT INTO dbo.TGrade (GradeName, GradeDesc, GradeBand, IsActive, CreatedBy, CreatedDate, Employerid)
    SELECT GradeName, GradeDesc, GradeBand, IsActive, ISNULL(CreatedBy, 1), GETDATE(), @EmployerId
    FROM dbo.TGrade WHERE Employerid = @TemplateEmployerId AND IsActive = 1;
    PRINT 'Cloned TGrade: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
END

IF NOT EXISTS (SELECT 1 FROM dbo.TEmployeeRoleMaster WHERE Employerid = @EmployerId AND IsActive = 1)
BEGIN
    INSERT INTO dbo.TEmployeeRoleMaster (EmployeeRoleName, EmployeeRoleDesc, IsActive, CreatedBy, CreatedDate, Employerid)
    SELECT EmployeeRoleName, EmployeeRoleDesc, IsActive, ISNULL(CreatedBy, 1), GETDATE(), @EmployerId
    FROM dbo.TEmployeeRoleMaster WHERE Employerid = @TemplateEmployerId AND IsActive = 1;
    PRINT 'Cloned TEmployeeRoleMaster: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
END

IF NOT EXISTS (SELECT 1 FROM dbo.TCalendarMaster WHERE Employerid = @EmployerId AND IsActive = 1)
BEGIN
    INSERT INTO dbo.TCalendarMaster
        (CalendarName, CalendarDesc, IsActive, CreatedBy, CreatedDate, Employerid,
         AllowHolidayOnWeeklyOff, IsHolidayPrecendenceOverWeeklyOff)
    SELECT CalendarName, CalendarDesc, IsActive, ISNULL(CreatedBy, 1), GETDATE(), @EmployerId,
           AllowHolidayOnWeeklyOff, IsHolidayPrecendenceOverWeeklyOff
    FROM dbo.TCalendarMaster WHERE Employerid = @TemplateEmployerId AND IsActive = 1;
    PRINT 'Cloned TCalendarMaster: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
END

------------------------------------------------------------------------------
-- 3. Rewrite Grade / WorkLocation / EmployeeRoleId / Calendarid / DesignationId on employees
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#G') IS NOT NULL DROP TABLE #G;
SELECT ROW_NUMBER() OVER (ORDER BY GradeId) AS Idx, GradeId AS ID
INTO #G FROM dbo.TGrade WHERE Employerid = @EmployerId AND IsActive = 1;
DECLARE @GCnt INT = (SELECT COUNT(*) FROM #G);

IF OBJECT_ID('tempdb..#R') IS NOT NULL DROP TABLE #R;
SELECT ROW_NUMBER() OVER (ORDER BY EmployeeRoleId) AS Idx, EmployeeRoleId AS ID
INTO #R FROM dbo.TEmployeeRoleMaster WHERE Employerid = @EmployerId AND IsActive = 1;
DECLARE @RCnt INT = (SELECT COUNT(*) FROM #R);

IF OBJECT_ID('tempdb..#L') IS NOT NULL DROP TABLE #L;
SELECT ROW_NUMBER() OVER (ORDER BY LocationId) AS Idx, LocationId AS ID
INTO #L FROM dbo.TLocation WHERE Employerid = @EmployerId AND IsActive = 1;
DECLARE @LCnt INT = (SELECT COUNT(*) FROM #L);

DECLARE @CalId INT =
    (SELECT TOP 1 CalendarId FROM dbo.TCalendarMaster WHERE Employerid = @EmployerId AND IsActive = 1 ORDER BY CalendarId);

IF @GCnt = 0 OR @RCnt = 0 OR @LCnt = 0 OR @CalId IS NULL
    THROW 50000, 'Missing Grade / EmployeeRole / Location / Calendar masters after clone.', 1;

;WITH Emp AS (
    SELECT ei.EmployeeId,
           ROW_NUMBER() OVER (ORDER BY ei.EmployeeId) AS Rn
    FROM dbo.TEmployeeInfo ei
    WHERE ei.EmployerID = @EmployerId
)
UPDATE ei
SET
    ei.DesignationId  = ISNULL(ei.DesignationId, ei.Title),
    ei.Grade          = g.ID,
    ei.WorkLocation   = w.ID,
    ei.EmployeeRoleId = r.ID,
    ei.Calendarid     = @CalId,
    ei.NoticePeriod   = ISNULL(ei.NoticePeriod, 30)
FROM dbo.TEmployeeInfo ei
JOIN Emp e ON e.EmployeeId = ei.EmployeeId
JOIN #G g ON g.Idx = ((e.Rn - 1) % @GCnt) + 1
JOIN #L w ON w.Idx = (e.Rn % @LCnt) + 1
JOIN #R r ON r.Idx = ((e.Rn - 1) % @RCnt) + 1
WHERE ei.EmployerID = @EmployerId;

PRINT 'Updated TEmployeeInfo DesignationId/Grade/WorkLocation/EmployeeRoleId/Calendarid: '
    + CAST(@@ROWCOUNT AS VARCHAR(10));

------------------------------------------------------------------------------
-- 4. My Details profile-section permissions + All Employees tab access
------------------------------------------------------------------------------
DELETE FROM dbo.TEmployeeRoleUserTabDetails
WHERE Employerid = @EmployerId
  AND RoleId IN (1, 3, 4)
  AND EmployeeId IS NULL;

INSERT INTO dbo.TEmployeeRoleUserTabDetails
    (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
     CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
SELECT RoleId, NULL, ModuleSectionId, ModuleTabId, @EmployerId, IsEditable,
       ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(), GETDATE(), ISNULL(UpdatedBy, ISNULL(CreatedBy, 1)), GETUTCDATE()
FROM dbo.TEmployeeRoleUserTabDetails
WHERE Employerid = @TemplateEmployerId
  AND RoleId IN (1, 3, 4)
  AND EmployeeId IS NULL;

-- Template often lacks RoleId 3/4; copy Administrator sections onto them.
INSERT INTO dbo.TEmployeeRoleUserTabDetails
    (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
     CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
SELECT r.RoleId, NULL, src.ModuleSectionId, src.ModuleTabId, @EmployerId, src.IsEditable,
       ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(),
       GETDATE(), ISNULL(src.UpdatedBy, ISNULL(src.CreatedBy, 1)), GETUTCDATE()
FROM dbo.TEmployeeRoleUserTabDetails src
CROSS JOIN (SELECT 3 AS RoleId UNION ALL SELECT 4) r
WHERE src.Employerid = @EmployerId
  AND src.RoleId = 1
  AND src.EmployeeId IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.TEmployeeRoleUserTabDetails x
      WHERE x.Employerid = @EmployerId
        AND x.RoleId = r.RoleId
        AND x.EmployeeId IS NULL
        AND x.ModuleSectionId = src.ModuleSectionId
        AND x.ModuleTabId = src.ModuleTabId
  );

PRINT 'TEmployeeRoleUserTabDetails (My Details sections) rows: ' + CAST((
    SELECT COUNT(*) FROM dbo.TEmployeeRoleUserTabDetails
    WHERE Employerid = @EmployerId AND RoleId IN (1, 3, 4) AND EmployeeId IS NULL
) AS VARCHAR(10));

------------------------------------------------------------------------------
-- 4b. Clone My Details user-tab access (TUserTabDetails MenuId=5) from a
--     template user of the same role onto each perf-test login.
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#TemplateMyDetailsUsers') IS NOT NULL DROP TABLE #TemplateMyDetailsUsers;
SELECT u.RoleID, MIN(u.UserID) AS SourceUserID
INTO #TemplateMyDetailsUsers
FROM dbo.TUsers u
JOIN dbo.TUserTabDetails utd ON utd.UserId = u.UserID
WHERE u.Employerid = @TemplateEmployerId
  AND u.RoleID IN (1, 3, 4)
  AND utd.MenuId = 5
GROUP BY u.RoleID;

DELETE utd
FROM dbo.TUserTabDetails utd
JOIN dbo.TUsers u ON u.UserID = utd.UserId
WHERE utd.Employerid = @EmployerId
  AND utd.MenuId = 5
  AND u.RoleID IN (1, 3, 4);

INSERT INTO dbo.TUserTabDetails (UserId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
SELECT targetU.UserID, src.MenuId, src.TabId, @EmployerId, src.IsEditable, ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE)
FROM dbo.TUsers targetU
JOIN #TemplateMyDetailsUsers map ON map.RoleID = targetU.RoleID
JOIN dbo.TUserTabDetails src ON src.UserId = map.SourceUserID
WHERE targetU.Employerid = @EmployerId
  AND targetU.RoleID IN (1, 3, 4)
  AND src.MenuId = 5;

PRINT 'TUserTabDetails cloned for My Details (MenuId=5): ' + CAST(@@ROWCOUNT AS VARCHAR(10));

------------------------------------------------------------------------------
-- 4c. All Employees tab permission (TRollWisePageAccess Tabid=59)
------------------------------------------------------------------------------
DELETE FROM dbo.TRollWisePageAccess
WHERE EmployerId = @EmployerId AND Tabid = 59 AND RoleId IN (1, 3, 4);

INSERT INTO dbo.TRollWisePageAccess
    (RoleId, ActiveFlag, InActiveFlag, EmployerId, CreatedBy, CreatedDate, Tabid, Menuid, CreationDateUtcTime, EmployeeIds)
SELECT u.RoleID, 'Y', 'Y', @EmployerId, 1, GETDATE(), 59, 5, GETUTCDATE(),
       CAST(ue.EmployeeID AS VARCHAR(20))
FROM dbo.TUsers u
JOIN dbo.TUserEmployee ue ON ue.UserID = u.UserID
WHERE u.Employerid = @EmployerId
  AND u.RoleID IN (1, 3, 4)
  AND u.IsActive = 'Y';

PRINT 'TRollWisePageAccess (All Employees) rows: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

------------------------------------------------------------------------------
-- 5. Child organizations (if none yet)
------------------------------------------------------------------------------
IF @ChildOrgCount > 0
   AND NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE ParentEmployerid = @EmployerId)
BEGIN
    UPDATE dbo.TEmployerDetails SET IsCrossReportingApplicable = 'Y' WHERE Employerid = @EmployerId;

    DECLARE @ParentName VARCHAR(100) =
        (SELECT EmployerName FROM dbo.TEmployerDetails WHERE Employerid = @EmployerId);
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
            SET @ChildName = LEFT(ISNULL(@ParentName, 'PERFTEST') + ' CHILD ' + CAST(@i AS VARCHAR(10)), 100);

            SELECT @ed_sel = STRING_AGG(
                    CAST(CASE name
                           WHEN 'Employerid' THEN '@ChildId'
                           WHEN 'EmployerName' THEN '@ChildName'
                           WHEN 'ParentEmployerid' THEN '@EmployerId'
                           WHEN 'RootEmployerId' THEN '@EmployerId'
                           WHEN 'custid' THEN '@ChildCust'
                           WHEN 'parentcustid' THEN 'NULL'
                           WHEN 'IsCrossReportingApplicable' THEN '''Y'''
                           ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEmployerDetails') AND name <> 'EmployerGUID';

            SET @ed_sql = N'INSERT INTO dbo.TEmployerDetails (' + @ed_cols + N')
SELECT ' + @ed_sel + N' FROM dbo.TEmployerDetails WHERE Employerid = @EmployerId;';
            EXEC sp_executesql @ed_sql,
                N'@ChildId INT, @ChildName VARCHAR(100), @EmployerId INT, @ChildCust VARCHAR(10)',
                @ChildId = @ChildId, @ChildName = @ChildName, @EmployerId = @EmployerId, @ChildCust = @ChildCust;

            SELECT @cs_cols = STRING_AGG(CAST(QUOTENAME(name) AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';
            SELECT @cs_sel = STRING_AGG(
                    CAST(CASE name WHEN 'CustomerId' THEN '@ChildCust'
                              WHEN 'EmployerId' THEN '@ChildId'
                              WHEN 'CustName' THEN '@ChildName'
                              ELSE QUOTENAME(name) END AS NVARCHAR(MAX)), ',') WITHIN GROUP (ORDER BY column_id)
            FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TCustomerSettings') AND name <> 'Id';

            SET @cs_sql = N'INSERT INTO dbo.TCustomerSettings (' + @cs_cols + N')
SELECT ' + @cs_sel + N' FROM dbo.TCustomerSettings WHERE EmployerId = @EmployerId;';
            EXEC sp_executesql @cs_sql,
                N'@ChildCust VARCHAR(10), @ChildId INT, @ChildName VARCHAR(100), @EmployerId INT',
                @ChildCust = @ChildCust, @ChildId = @ChildId, @ChildName = @ChildName, @EmployerId = @EmployerId;

        COMMIT TRAN;

        PRINT 'Child org: Employerid=' + CAST(@ChildId AS VARCHAR(10)) + ', custid=' + @ChildCust;
        SET @i += 1;
    END
END
ELSE IF EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE ParentEmployerid = @EmployerId)
    PRINT 'Child orgs already exist under Employerid ' + CAST(@EmployerId AS VARCHAR(10)) + ' -- skipped.';

DECLARE @RootAnchorEmpId INT =
    (
        SELECT TOP 1 ei.EmployeeId
        FROM dbo.TEmployeeInfo ei
        WHERE ei.EmployerID = @EmployerId
          AND ei.EmploymentNumber = 'PT0000001'
        ORDER BY ei.EmployeeId
    );

IF @RootAnchorEmpId IS NULL
    SELECT TOP 1 @RootAnchorEmpId = e.EmployeeId
    FROM dbo.TEmployee e
    WHERE e.Employerid = @EmployerId
      AND e.IsActive = 'Y'
    ORDER BY e.EmployeeId;

;WITH ChildRootEmployees AS (
    SELECT child.ChildEmployerId,
           childRoot.EmployeeId
    FROM (
        SELECT Employerid AS ChildEmployerId
        FROM dbo.TEmployerDetails
        WHERE ParentEmployerid = @EmployerId
    ) child
    CROSS APPLY (
        SELECT TOP 1 ei.EmployeeId
        FROM dbo.TEmployeeInfo ei
        WHERE ei.EmployerID = child.ChildEmployerId
        ORDER BY ei.EmployeeId
    ) childRoot
)
UPDATE ei
SET ei.FunctionalManager = @RootAnchorEmpId
FROM dbo.TEmployeeInfo ei
JOIN ChildRootEmployees cr ON cr.EmployeeId = ei.EmployeeId
WHERE @RootAnchorEmpId IS NOT NULL;

UPDATE oc
SET oc.ReportsTo = @RootAnchorEmpId
FROM dbo.TORGChart oc
JOIN (
    SELECT childRoot.EmployeeId
    FROM (
        SELECT Employerid AS ChildEmployerId
        FROM dbo.TEmployerDetails
        WHERE ParentEmployerid = @EmployerId
    ) child
    CROSS APPLY (
        SELECT TOP 1 ei.EmployeeId
        FROM dbo.TEmployeeInfo ei
        WHERE ei.EmployerID = child.ChildEmployerId
        ORDER BY ei.EmployeeId
    ) childRoot
) cr ON cr.EmployeeId = oc.EmployeeID
WHERE @RootAnchorEmpId IS NOT NULL;

PRINT 'Child-root employees rewired to root employee: ' + CAST(ISNULL(@RootAnchorEmpId, 0) AS VARCHAR(20));

DECLARE @AccessibleEmployerIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(Employerid AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY Employerid)
        FROM (
            SELECT @EmployerId AS Employerid
            UNION ALL
            SELECT Employerid
            FROM dbo.TEmployerDetails
            WHERE ParentEmployerid = @EmployerId
        ) AS accessible
    );

UPDATE u
SET u.IsGlobalAccess = 'Y',
    u.EmployerIds = @AccessibleEmployerIds
FROM dbo.TUsers u
JOIN dbo.TUserEmployee ue ON ue.UserID = u.UserID
JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = ue.EmployeeID
WHERE u.Employerid = @EmployerId
  AND u.RoleID = 1
  AND ei.EmployerID = @EmployerId
  AND ei.EmploymentNumber = 'PT0000001';

PRINT 'Root login global access employers: ' + ISNULL(@AccessibleEmployerIds, CAST(@EmployerId AS VARCHAR(20)));

------------------------------------------------------------------------------
-- 6. Refresh parent TRolePagesMapping LocationIds / BusinessUnitIds so
--    FN_LocationBU_GetAllActiveInActive_EmployeeDetails includes child-org
--    employees when those employers are selected in All Employees.
--    Without this, parent RolePagesMapping only lists parent Location/Unit IDs
--    and child employees are filtered out even with IsGlobalAccess = 'Y'.
------------------------------------------------------------------------------
DECLARE @TreeLocationIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(LocationId AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY LocationId)
        FROM (
            SELECT DISTINCT l.LocationId
            FROM dbo.TLocation l
            WHERE l.Employerid = @EmployerId
               OR l.Employerid IN (
                    SELECT Employerid
                    FROM dbo.TEmployerDetails
                    WHERE ParentEmployerid = @EmployerId
                )
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
                    u.Employerid = @EmployerId
                    OR u.Employerid IN (
                        SELECT Employerid
                        FROM dbo.TEmployerDetails
                        WHERE ParentEmployerid = @EmployerId
                    )
                  )
        ) units
    );

IF @TreeLocationIds IS NOT NULL AND @TreeBusinessUnitIds IS NOT NULL
BEGIN
    UPDATE dbo.TRolePagesMapping
    SET LocationIds = @TreeLocationIds,
        BusinessUnitIds = @TreeBusinessUnitIds
    WHERE Employerid = @EmployerId
      AND RoleID IN (1, 3, 4);

    PRINT 'Parent TRolePagesMapping Location/BU refreshed for RoleID 1/3/4'
        + ' (locations=' + CAST(LEN(@TreeLocationIds) - LEN(REPLACE(@TreeLocationIds, ',', '')) + 1 AS VARCHAR(20))
        + ', units=' + CAST(LEN(@TreeBusinessUnitIds) - LEN(REPLACE(@TreeBusinessUnitIds, ',', '')) + 1 AS VARCHAR(20))
        + ').';
END
ELSE
    PRINT 'Skipped TRolePagesMapping Location/BU refresh -- no location/unit rows found under employer tree.';

PRINT 'Done. Sign out/in (or hard-refresh My Details) to see All Employees + updated profile fields.';
PRINT 'Root employee still has no FunctionalManager/ReportsTo -- that is expected for the tree root.';
