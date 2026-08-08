/* =============================================================================
   Live discovery for setup-test-workflow.sql -- run this FIRST against your
   target DEV employer to see what's actually there, instead of relying on a
   static list. Read-only, makes no changes.

   WHY THIS EXISTS INSTEAD OF A HARDCODED MODULE LIST: THrmsModules/TModulePages
   have no master seed script anywhere in source -- Modules are enabled per
   employer via TEmployerModule (mirrors the exact query in
   SP_AdminWM_GetHRMSModules.sql, the proc the Admin > Workflow Management
   screen's "Select Module" dropdown actually calls), and TModulePages rows
   were added incrementally by ~50 different one-off migration scripts over
   the project's history. Neither is reconstructable as a fixed list from
   source alone -- querying your actual target DB is the only authoritative
   source. See pagetitle-reference.md for a best-effort static reference
   covering the pages I could verify from source, in case you want the
   business-feature context (which page belongs to which real user-facing
   feature) alongside this live data.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @TargetEmployerId INT = 0;   -- <<< SET THIS to the employer you're setting up a workflow for

IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId before running this script.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TargetEmployerId)
    THROW 50000, 'TargetEmployerId does not exist in TEmployerDetails.', 1;

------------------------------------------------------------------------------
-- 1. Active modules for this employer (same logic as SP_AdminWM_GetHRMSModules)
------------------------------------------------------------------------------
DECLARE @RootEmployerId INT;
SELECT @RootEmployerId = RootEmployerId FROM dbo.TEmployerDetails WHERE EmployerID = @TargetEmployerId;

PRINT '--- Active modules for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10)) + ' ---';
SELECT DISTINCT
    HM.ModuleId,
    HM.ModuleName
FROM dbo.THrmsModules HM WITH (NOLOCK)
INNER JOIN dbo.TEmployerModule EM WITH (NOLOCK) ON HM.ModuleId = EM.HrmsModuleID
WHERE HM.IsActive = 1
  AND EM.IsActive = 1
  AND EM.EmployerId = @RootEmployerId
ORDER BY HM.ModuleName;

------------------------------------------------------------------------------
-- 2. Every workflow-eligible page under those modules -- @ModulePageName in
--    setup-test-workflow.sql must be one of these ModulePageName values
------------------------------------------------------------------------------
PRINT '--- Workflow-eligible pages (IsWorkflowAvailable = 1) ---';
SELECT
    HM.ModuleName,
    MP.ModulePageName,
    MP.PageDescription,
    MP.MappedAppPage
FROM dbo.TModulePages MP WITH (NOLOCK)
INNER JOIN dbo.THrmsModules HM WITH (NOLOCK) ON HM.ModuleId = MP.PageModuleId
INNER JOIN dbo.TEmployerModule EM WITH (NOLOCK) ON HM.ModuleId = EM.HrmsModuleID AND EM.EmployerId = @RootEmployerId
WHERE HM.IsActive = 1 AND EM.IsActive = 1 AND ISNULL(MP.IsWorkflowAvailable, 0) = 1 AND MP.IsEnable = 'Y'
ORDER BY HM.ModuleName, MP.ModulePageName;

PRINT '--- All other pages for these modules (IsWorkflowAvailable = 0 or unset -- usually notification-only, verify before using) ---';
SELECT
    HM.ModuleName,
    MP.ModulePageName,
    MP.PageDescription,
    MP.MappedAppPage
FROM dbo.TModulePages MP WITH (NOLOCK)
INNER JOIN dbo.THrmsModules HM WITH (NOLOCK) ON HM.ModuleId = MP.PageModuleId
INNER JOIN dbo.TEmployerModule EM WITH (NOLOCK) ON HM.ModuleId = EM.HrmsModuleID AND EM.EmployerId = @RootEmployerId
WHERE HM.IsActive = 1 AND EM.IsActive = 1 AND ISNULL(MP.IsWorkflowAvailable, 0) = 0
ORDER BY HM.ModuleName, MP.ModulePageName;

------------------------------------------------------------------------------
-- 3. Existing roles for this employer -- pick one as @ExistingRoleId in
--    setup-test-workflow.sql's role-based ('U') setup, e.g. the 'HR[6]'-style
--    approver shown on the Define Workflow screen
------------------------------------------------------------------------------
PRINT '--- Roles available for role-based ("U") workflow approvers ---';
SELECT
    R.RoleID,
    R.RoleName,
    R.IsActive,
    R.IsGlobalAccess,
    (SELECT COUNT(*) FROM dbo.tRoleEmployeeMapping rem WHERE rem.Roleid = R.RoleID) AS MappedEmployeeCount,
    (SELECT COUNT(*) FROM dbo.tRoleBusinessUnitMapping rbm WHERE rbm.Roleid = R.RoleID) AS MappedBUCount,
    (SELECT COUNT(*) FROM dbo.tRoleLocationMapping rlm WHERE rlm.Roleid = R.RoleID) AS MappedLocationCount
FROM dbo.TRoles R WITH (NOLOCK)
WHERE (R.Employerid = @TargetEmployerId OR R.IsGlobalAccess = 'Y')
  AND R.IsActive = 'Y'
ORDER BY R.RoleName;

------------------------------------------------------------------------------
-- 4. Workflows already configured for this employer -- same info the Define
--    Workflow screen shows (approver display mirrors its 'RoleName[RoleID]'
--    format for role-based levels)
------------------------------------------------------------------------------
PRINT '--- Existing TWorkflowManagement rows for this employer ---';
SELECT
    WM.WorkflowId,
    WM.WorkflowName,
    MP.ModulePageName,
    HM.ModuleName,
    WM.RoutingLevels,
    WM.isenable,
    WM.IsDelete
FROM dbo.TWorkflowManagement WM WITH (NOLOCK)
LEFT JOIN dbo.TModulePages MP WITH (NOLOCK) ON CAST(MP.ModulePageId AS VARCHAR(50)) = WM.MappedPages
LEFT JOIN dbo.THrmsModules HM WITH (NOLOCK) ON HM.ModuleId = WM.ModuleId
WHERE WM.Employerid = @TargetEmployerId
ORDER BY WM.WorkflowId DESC;

PRINT '--- Their approval levels ---';
SELECT
    WD.WorkflowId,
    WD.RoutingLevels AS ApprovalLevel,
    WD.WorkflowRole,
    CASE WD.WorkflowRole
        WHEN 'U' THEN ISNULL(R.RoleName, '(unknown role)') + '[' + CAST(WD.ManagerId AS VARCHAR(10)) + ']'
        WHEN 'R' THEN '(dynamic: requester''s ReportsTo)'
        WHEN 'F' THEN '(dynamic: requester''s FunctionalManager)'
        ELSE '(role code ''' + WD.WorkflowRole + ''' -- see USP_WorkFlow_Routing_Levels.sql for resolution logic)'
    END AS ApproverDisplay
FROM dbo.TWorkflowDetails WD WITH (NOLOCK)
INNER JOIN dbo.TWorkflowManagement WM WITH (NOLOCK) ON WM.WorkflowId = WD.WorkflowId
LEFT JOIN dbo.TRoles R WITH (NOLOCK) ON R.RoleID = WD.ManagerId AND WD.WorkflowRole = 'U'
WHERE WM.Employerid = @TargetEmployerId AND WD.IsDelete = 0
ORDER BY WD.WorkflowId DESC, WD.RoutingLevels;
