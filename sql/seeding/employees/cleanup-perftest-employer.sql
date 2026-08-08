/* =============================================================================
   Remove a tenant created by seed-new-employer-performance-test.sql,
   including any child orgs whose ParentEmployerid / RootEmployerId point at it.

   Deletes, for the given root @EmployerIdToDelete (and its children):
     TRollWisePageAccess, TUserEmployee/TUsers, TORGChart / TEmployeeInfo /
     TEmployee, menu / role-page / role-tab access, TGrade / TEmployeeRoleMaster /
     TCalendarMaster, TTitle / TOrgHierarchyDetails / TMEmploymentTypes /
     TLocation, TCustomerSettings, TLicence, TEmployerDetails.

   Does NOT touch Employerid=0 template rows. Refuses Employerid 0 / NULL.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @EmployerIdToDelete INT = 232;   -- <<< SET THIS to the root Employerid printed by the seed script

IF @EmployerIdToDelete IS NULL OR @EmployerIdToDelete <= 0
BEGIN
    RAISERROR('Set @EmployerIdToDelete to a real perf-test Employerid before running this script.', 16, 1);
    RETURN;
END

IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @EmployerIdToDelete)
BEGIN
    RAISERROR('No TEmployerDetails row found for Employerid = %d.', 16, 1, @EmployerIdToDelete);
    RETURN;
END

IF OBJECT_ID('tempdb..#OrgsToDelete') IS NOT NULL DROP TABLE #OrgsToDelete;
CREATE TABLE #OrgsToDelete (Employerid INT NOT NULL PRIMARY KEY);

-- Root + any descendants that still point at it as parent or root
INSERT INTO #OrgsToDelete (Employerid)
SELECT Employerid FROM dbo.TEmployerDetails
WHERE Employerid = @EmployerIdToDelete
   OR ParentEmployerid = @EmployerIdToDelete
   OR RootEmployerId = @EmployerIdToDelete;

DECLARE @OrgCount INT = (SELECT COUNT(*) FROM #OrgsToDelete);
PRINT 'Deleting tenant tree rooted at Employerid = ' + CAST(@EmployerIdToDelete AS VARCHAR(10))
    + ' (' + CAST(@OrgCount AS VARCHAR(10)) + ' org(s)) ...';

BEGIN TRAN CleanupTenant;

    DELETE FROM dbo.TRollWisePageAccess WHERE EmployerId IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE ue
    FROM dbo.TUserEmployee ue
    JOIN dbo.TEmployee e ON e.EmployeeId = ue.EmployeeID
    WHERE e.Employerid IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE FROM dbo.TUsers WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE oc
    FROM dbo.TORGChart oc
    JOIN dbo.TEmployee e ON e.EmployeeId = oc.EmployeeID
    WHERE e.Employerid IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE FROM dbo.TEmployeeInfo WHERE EmployerID IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TEmployee WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE FROM dbo.TRoleTabDetails   WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TRolePagesMapping WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.tMenuDetails      WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TMenuHierarchy    WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE FROM dbo.TGrade               WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TEmployeeRoleMaster  WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TCalendarMaster      WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);

    DELETE FROM dbo.TTitle WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TOrgHierarchyDetails WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TMEmploymentTypes WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TLocation WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TCustomerSettings WHERE EmployerId IN (SELECT Employerid FROM #OrgsToDelete);
    DELETE FROM dbo.TLicence WHERE EmployerID IN (SELECT Employerid FROM #OrgsToDelete);

    -- Children first, then root (FK-free, but delete non-roots first for clarity)
    DELETE FROM dbo.TEmployerDetails
    WHERE Employerid IN (SELECT Employerid FROM #OrgsToDelete)
      AND Employerid <> @EmployerIdToDelete;

    DELETE FROM dbo.TEmployerDetails WHERE Employerid = @EmployerIdToDelete;

COMMIT TRAN CleanupTenant;

PRINT 'Tenant tree rooted at ' + CAST(@EmployerIdToDelete AS VARCHAR(10)) + ' removed.';
