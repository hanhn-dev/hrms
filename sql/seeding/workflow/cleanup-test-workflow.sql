/* =============================================================================
   Remove a workflow created by setup-test-workflow.sql / the per-page scripts
   under adhoc-sql/workflow/<module>/ (the per-page setup .sql files).

   Prefer the colocated <PageName>.cleanup.sql when tearing down one page's
   TEST workflow -- those hardcode @WorkflowName / @ModulePageName for you.
   Use THIS script when you already know the WorkflowId, or to bulk-delete
   every "TEST - %" workflow for an employer.

   Deletes (in order):
     TWorkflowDetails
     TWorkFlowLocationsHistory / TWorkFlowLocations
     TWorkFlowBusinessUnitsHistory / TWorkFlowBusinessUnits
     TWorkflowManagement_History
     TWorkflowManagement

   Does NOT touch TRequestWorkflows -- if you already submitted a request
   through this workflow, its routing rows are left as-is (they reference
   WorkflowId but aren't FK-enforced to it); clean those up separately if needed.

   @RoleIdToDelete is OPTIONAL and OFF by default (0). Only set it if the
   setup script created a brand-new disposable role (@NewRoleName) -- NEVER
   set this to a reused @ExistingRoleId / defaulted HR role.

   Pick ONE targeting mode:
     A) @WorkflowIdToDelete > 0                         -- exact id
     B) @TargetEmployerId > 0 AND @WorkflowName set      -- match name for employer
     C) @TargetEmployerId > 0 AND @DeleteAllTestPrefix=1 -- every WorkflowName LIKE 'TEST - %'
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @WorkflowIdToDelete   INT          = 0;     -- <<< mode A
DECLARE @TargetEmployerId     INT          = 0;     -- <<< mode B / C
DECLARE @WorkflowName         VARCHAR(100) = NULL;  -- <<< mode B (exact name, e.g. 'TEST - My Details - EmploymentTypeChange')
DECLARE @DeleteAllTestPrefix  BIT          = 0;     -- <<< mode C: delete all WorkflowName LIKE 'TEST - %' for employer
DECLARE @RoleIdToDelete       INT          = 0;     -- <<< OPTIONAL: only a NEW disposable role from @NewRoleName
DECLARE @DryRun               BIT          = 0;     -- <<< 1 = list targets only, make no changes

IF @WorkflowIdToDelete <= 0
   AND NOT (@TargetEmployerId > 0 AND (@WorkflowName IS NOT NULL OR @DeleteAllTestPrefix = 1))
BEGIN
    THROW 50000, 'Set mode A (@WorkflowIdToDelete), or mode B (@TargetEmployerId + @WorkflowName), or mode C (@TargetEmployerId + @DeleteAllTestPrefix = 1).', 1;
END

IF @RoleIdToDelete > 0 AND NOT EXISTS (SELECT 1 FROM dbo.TRoles WHERE RoleID = @RoleIdToDelete)
    THROW 50000, '@RoleIdToDelete does not exist in TRoles.', 1;

------------------------------------------------------------------------------
-- 2. RESOLVE TARGET WORKFLOW IDS
------------------------------------------------------------------------------
DECLARE @Targets TABLE (WorkflowId INT PRIMARY KEY, WorkflowName VARCHAR(100), Employerid INT);

IF @WorkflowIdToDelete > 0
BEGIN
    INSERT INTO @Targets (WorkflowId, WorkflowName, Employerid)
    SELECT WM.WorkflowId, WM.WorkflowName, WM.Employerid
    FROM dbo.TWorkflowManagement WM
    WHERE WM.WorkflowId = @WorkflowIdToDelete;

    IF NOT EXISTS (SELECT 1 FROM @Targets)
        THROW 50000, 'No TWorkflowManagement row found for that @WorkflowIdToDelete.', 1;
END
ELSE IF @DeleteAllTestPrefix = 1
BEGIN
    INSERT INTO @Targets (WorkflowId, WorkflowName, Employerid)
    SELECT WM.WorkflowId, WM.WorkflowName, WM.Employerid
    FROM dbo.TWorkflowManagement WM
    WHERE WM.Employerid = @TargetEmployerId
      AND WM.WorkflowName LIKE 'TEST - %';
END
ELSE
BEGIN
    INSERT INTO @Targets (WorkflowId, WorkflowName, Employerid)
    SELECT WM.WorkflowId, WM.WorkflowName, WM.Employerid
    FROM dbo.TWorkflowManagement WM
    WHERE WM.Employerid = @TargetEmployerId
      AND WM.WorkflowName = @WorkflowName;
END

IF NOT EXISTS (SELECT 1 FROM @Targets)
BEGIN
    PRINT 'No matching workflows found -- nothing to delete.';
    RETURN;
END

PRINT '--- Workflows targeted for deletion ---';
SELECT WorkflowId, WorkflowName, Employerid FROM @Targets ORDER BY WorkflowId;

IF @DryRun = 1
BEGIN
    PRINT 'Dry run only -- no rows deleted. Set @DryRun = 0 to proceed.';
    RETURN;
END

------------------------------------------------------------------------------
-- 3. DELETE
------------------------------------------------------------------------------
BEGIN TRAN CleanupWorkflow;

    DELETE WD
    FROM dbo.TWorkflowDetails WD
    INNER JOIN @Targets T ON T.WorkflowId = WD.WorkflowId;

    DELETE H
    FROM dbo.TWorkFlowLocationsHistory H
    INNER JOIN @Targets T ON T.WorkflowId = H.WorkFlowID;

    DELETE L
    FROM dbo.TWorkFlowLocations L
    INNER JOIN @Targets T ON T.WorkflowId = L.WorkFlowID;

    DELETE H
    FROM dbo.TWorkFlowBusinessUnitsHistory H
    INNER JOIN @Targets T ON T.WorkflowId = H.WorkFlowID;

    DELETE B
    FROM dbo.TWorkFlowBusinessUnits B
    INNER JOIN @Targets T ON T.WorkflowId = B.WorkFlowID;

    DELETE H
    FROM dbo.TWorkflowManagement_History H
    INNER JOIN @Targets T ON T.WorkflowId = H.WorkflowId;

    DELETE WM
    FROM dbo.TWorkflowManagement WM
    INNER JOIN @Targets T ON T.WorkflowId = WM.WorkflowId;

    IF @RoleIdToDelete > 0
    BEGIN
        DELETE FROM dbo.tRoleEmployeeMapping WHERE Roleid = @RoleIdToDelete;
        DELETE FROM dbo.tRoleBusinessUnitMapping WHERE Roleid = @RoleIdToDelete;
        DELETE FROM dbo.tRoleLocationMapping WHERE Roleid = @RoleIdToDelete;
        DELETE FROM dbo.TRoles WHERE RoleID = @RoleIdToDelete;
        PRINT 'Also deleted disposable RoleID = ' + CAST(@RoleIdToDelete AS VARCHAR(10)) + ' and its mappings.';
    END

COMMIT TRAN CleanupWorkflow;

DECLARE @DeletedCount INT;
SELECT @DeletedCount = COUNT(*) FROM @Targets;
PRINT 'Deleted ' + CAST(@DeletedCount AS VARCHAR(10)) + ' workflow(s).';
