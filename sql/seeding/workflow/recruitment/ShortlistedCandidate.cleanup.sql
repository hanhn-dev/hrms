/* =============================================================================
   Remove the TEST workflow created by recruitment/ShortlistedCandidate.sql.

   Matches TWorkflowManagement by @TargetEmployerId + exact @WorkflowName
   (and optionally cleans a disposable @NewRoleName role). Prefer this over
   guessing WorkflowIds. For bulk cleanup of every "TEST - %" workflow on an
   employer, use ../cleanup-test-workflow.sql with @DeleteAllTestPrefix = 1.

   Deletes: TWorkflowDetails, TWorkFlowLocations(+History),
   TWorkFlowBusinessUnits(+History), TWorkflowManagement_History,
   TWorkflowManagement. Does NOT touch TRequestWorkflows.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT          = 0;    -- <<< SET THIS
DECLARE @ModulePageName   VARCHAR(200) = 'ShortlistedCandidate';  -- FIXED -- do not change
DECLARE @WorkflowName     VARCHAR(100) = 'TEST - Recruitment - ShortlistedCandidate';  -- FIXED -- do not change
DECLARE @RoleIdToDelete   INT          = 0;    -- <<< OPTIONAL: only if setup used @NewRoleName
DECLARE @DryRun           BIT          = 0;    -- <<< 1 = list matches only

IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId before running this cleanup script.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TargetEmployerId)
    THROW 50000, 'TargetEmployerId does not exist in TEmployerDetails.', 1;
IF @RoleIdToDelete > 0 AND NOT EXISTS (SELECT 1 FROM dbo.TRoles WHERE RoleID = @RoleIdToDelete)
    THROW 50000, '@RoleIdToDelete does not exist in TRoles.', 1;

------------------------------------------------------------------------------
-- 2. RESOLVE TARGETS
------------------------------------------------------------------------------
DECLARE @Targets TABLE (WorkflowId INT PRIMARY KEY, WorkflowName VARCHAR(100), MappedPages VARCHAR(200));

INSERT INTO @Targets (WorkflowId, WorkflowName, MappedPages)
SELECT WM.WorkflowId, WM.WorkflowName, WM.MappedPages
FROM dbo.TWorkflowManagement WM
WHERE WM.Employerid = @TargetEmployerId
  AND WM.WorkflowName = @WorkflowName;

-- Also catch older/alternate TEST runs mapped to the same page.
DECLARE @ModulePageId INT;
SELECT @ModulePageId = ModulePageId FROM dbo.TModulePages WHERE ModulePageName = @ModulePageName;

IF @ModulePageId IS NOT NULL
BEGIN
    INSERT INTO @Targets (WorkflowId, WorkflowName, MappedPages)
    SELECT WM.WorkflowId, WM.WorkflowName, WM.MappedPages
    FROM dbo.TWorkflowManagement WM
    WHERE WM.Employerid = @TargetEmployerId
      AND WM.WorkflowName LIKE 'TEST - %'
      AND (
            WM.MappedPages = CAST(@ModulePageId AS VARCHAR(50))
         OR WM.MappedPages LIKE CAST(@ModulePageId AS VARCHAR(50)) + ',%'
         OR WM.MappedPages LIKE '%,' + CAST(@ModulePageId AS VARCHAR(50)) + ',%'
         OR WM.MappedPages LIKE '%,' + CAST(@ModulePageId AS VARCHAR(50))
      )
      AND NOT EXISTS (SELECT 1 FROM @Targets T WHERE T.WorkflowId = WM.WorkflowId);
END

IF NOT EXISTS (SELECT 1 FROM @Targets)
BEGIN
    PRINT 'No matching TEST workflows found for Employerid = '
        + CAST(@TargetEmployerId AS VARCHAR(10))
        + ', WorkflowName = ''' + @WorkflowName + ''' / ModulePageName = ''' + @ModulePageName + '''.';
    RETURN;
END

PRINT '--- Workflows targeted for deletion ---';
SELECT WorkflowId, WorkflowName, MappedPages FROM @Targets ORDER BY WorkflowId;

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
PRINT 'Deleted ' + CAST(@DeletedCount AS VARCHAR(10))
    + ' workflow(s) for ModulePageName = ''' + @ModulePageName + '''.';
