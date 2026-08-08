/* =============================================================================
   Fix missing TEmployeeInfo.RootEmployerId on perf-test tenants.

   SP_EC_AddNewEmployee always writes RootEmployerId from TEmployerDetails.
   Perf-test seeds omitted that column, so every TEmployeeInfo row has NULL.

   Impact on My Details / PersonalInformation.aspx:
     SP_Admin_GetAllEmployeeDetails (cross-reporting + global access) filters
       b.RootEmployerid = @Lv_RootEmployerId
     NULL never matches, so manager lists stay empty; other SPs that rely on
     RootEmployerId for org-scoped walks also misbehave. Combined with
     Admin IsGlobalAccess=Y and IsCrossReportingApplicable=Y this contributes
     to fragile My Details page loads (Oops via Application_Error).

   Also backfills TEmployeeRoleUserTabDetails for RoleId 3/4 when the template
   only had RoleId 1 (template employer 10 uses tenant roles 423/467, not
   global Manager/Employee 3/4). Copies Administrator section rows onto 3/4.

   Edit @CustId (root custid), then run. Applies to the root and every child
   under ParentEmployerid / RootEmployerId.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @CustId VARCHAR(10) = 'C00232';
DECLARE @RootEmployerId INT =
    (SELECT Employerid FROM dbo.TEmployerDetails WHERE custid = @CustId);

IF @RootEmployerId IS NULL
    THROW 50000, 'Employer not found for that custid.', 1;

IF OBJECT_ID('tempdb..#TargetEmployers') IS NOT NULL DROP TABLE #TargetEmployers;
SELECT Employerid
INTO #TargetEmployers
FROM dbo.TEmployerDetails
WHERE Employerid = @RootEmployerId
   OR ParentEmployerid = @RootEmployerId
   OR RootEmployerId = @RootEmployerId;

------------------------------------------------------------------------------
-- 1. Backfill TEmployeeInfo.RootEmployerId from TEmployerDetails
------------------------------------------------------------------------------
UPDATE ei
SET ei.RootEmployerId = ed.RootEmployerId
FROM dbo.TEmployeeInfo ei
INNER JOIN dbo.TEmployerDetails ed ON ed.Employerid = ei.EmployerID
WHERE ei.EmployerID IN (SELECT Employerid FROM #TargetEmployers)
  AND ei.RootEmployerId IS NULL;

PRINT 'Updated TEmployeeInfo.RootEmployerId on '
    + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' row(s) for root Employerid '
    + CAST(@RootEmployerId AS VARCHAR(10)) + ' (custid ' + @CustId + ') and children.';

------------------------------------------------------------------------------
-- 2. Ensure My Details section tabs exist for RoleId 3 and 4
--    (copy from RoleId 1 on the same employer when missing)
------------------------------------------------------------------------------
DECLARE @EmpId INT;

DECLARE curEmp CURSOR LOCAL FAST_FORWARD FOR
    SELECT Employerid FROM #TargetEmployers ORDER BY Employerid;
OPEN curEmp;
FETCH NEXT FROM curEmp INTO @EmpId;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF EXISTS (
        SELECT 1 FROM dbo.TEmployeeRoleUserTabDetails
        WHERE Employerid = @EmpId AND RoleId = 1 AND EmployeeId IS NULL
    )
    BEGIN
        INSERT INTO dbo.TEmployeeRoleUserTabDetails
            (RoleId, EmployeeId, ModuleSectionId, ModuleTabId, Employerid, IsEditable,
             CreatedBy, CreatedDate, CreatedUtcDate, UpdatedDate, UpdatedBy, UpdatedUtcDate)
        SELECT r.RoleId, NULL, src.ModuleSectionId, src.ModuleTabId, @EmpId, src.IsEditable,
               ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE), GETUTCDATE(),
               GETDATE(), ISNULL(src.UpdatedBy, ISNULL(src.CreatedBy, 1)), GETUTCDATE()
        FROM dbo.TEmployeeRoleUserTabDetails src
        CROSS JOIN (SELECT 3 AS RoleId UNION ALL SELECT 4) r
        WHERE src.Employerid = @EmpId
          AND src.RoleId = 1
          AND src.EmployeeId IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.TEmployeeRoleUserTabDetails x
              WHERE x.Employerid = @EmpId
                AND x.RoleId = r.RoleId
                AND x.EmployeeId IS NULL
                AND x.ModuleSectionId = src.ModuleSectionId
                AND x.ModuleTabId = src.ModuleTabId
          );

        PRINT 'Employerid ' + CAST(@EmpId AS VARCHAR(10))
            + ': inserted ' + CAST(@@ROWCOUNT AS VARCHAR(10))
            + ' TEmployeeRoleUserTabDetails row(s) for RoleId 3/4.';
    END

    FETCH NEXT FROM curEmp INTO @EmpId;
END
CLOSE curEmp; DEALLOCATE curEmp;

------------------------------------------------------------------------------
-- 3. Verify
------------------------------------------------------------------------------
SELECT ei.EmployerID, ed.custid,
       COUNT(*) AS EmpInfoCnt,
       SUM(CASE WHEN ei.RootEmployerId IS NULL THEN 1 ELSE 0 END) AS NullRootCnt,
       MIN(ei.RootEmployerId) AS MinRoot, MAX(ei.RootEmployerId) AS MaxRoot
FROM dbo.TEmployeeInfo ei
JOIN dbo.TEmployerDetails ed ON ed.Employerid = ei.EmployerID
WHERE ei.EmployerID IN (SELECT Employerid FROM #TargetEmployers)
GROUP BY ei.EmployerID, ed.custid
ORDER BY ei.EmployerID;

SELECT Employerid, RoleId, COUNT(*) AS RoleTabCnt
FROM dbo.TEmployeeRoleUserTabDetails
WHERE Employerid IN (SELECT Employerid FROM #TargetEmployers)
  AND RoleId IN (1, 3, 4)
  AND EmployeeId IS NULL
GROUP BY Employerid, RoleId
ORDER BY Employerid, RoleId;

IF OBJECT_ID('tempdb..#TargetEmployers') IS NOT NULL DROP TABLE #TargetEmployers;
