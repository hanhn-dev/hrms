/* =============================================================================
   Create a test workflow for the My Details module's EmployeeLetters page
   (TWorkflowManagement + N TWorkflowDetails level rows) for an EXISTING
   employer in DEV, so you can exercise SP_ApproveWorkFlowRequest /
   SP_RejectWorkFlowRequest end to end.

   Reuses the app's own creation procs -- SP_AdminWM_AddDefinition (writes
   TWorkflowManagement, TWorkFlowLocations, TWorkFlowBusinessUnits and their
   History tables) and SP_AdminWM_AddDefinitionDet (writes one TWorkflowDetails
   row per approval level) -- the same procs the Admin > Workflow Management
   screen calls, instead of hand-rolling inserts.

   Employee letters approval. Confirmed live for employer 10 via list-modules-and-pages.sql /
   SP_AdminWM_GetHRMSModules + TModulePages (IsWorkflowAvailable = 1).

   See ../list-modules-and-pages.sql to pick @TargetEmployerId, roles, and
   employees for this run, ../pagetitle-reference.md for this page's
   business-feature context, and ../cleanup-test-workflow.sql for teardown.

   HOW APPROVAL ROUTING ACTUALLY WORKS (verified against
   USP_WorkFlow_Routing_Levels.sql, the proc SP_ApproveWorkFlowRequest's
   request-creation callers use to resolve approvers) -- READ BEFORE RUNNING:

     - @WorkflowRoleCode = 'U' (role-based, DEFAULT/RECOMMENDED): the approver
       is whoever TRoles/tRoleEmployeeMapping says holds a given role, scoped
       to a BusinessUnit/Location via tRoleBusinessUnitMapping/
       tRoleLocationMapping -- this is what your live data actually uses (the
       'HR[6]' approver you saw on the Define Workflow screen is exactly this:
       RoleName 'HR', RoleID 6). This script can either reuse an EXISTING role
       (set @ExistingRoleId) or create a disposable NEW one for this test (set
       @NewRoleName + @ApproverEmployeeId). Confirmed generic fallback in
       USP_WorkFlow_Routing_Levels.sql: role-based resolution applies to
       virtually every RequestType, INCLUDING RecruitmentManagement and
       ResignationDetails/Pullback -- those domains additionally support their
       own alternate role codes ('B'/'D'/'H'/'M' for recruitment) as options,
       not requirements, so 'U' still works there as it does everywhere else.
     - @WorkflowRoleCode = 'R' / 'F' (simpler, less realistic): route to the
       requester's TORGChart.ReportsTo / TEmployeeInfo.FunctionalManager,
       resolved dynamically per request -- no role/mapping setup needed, but
       CONFIRMED: every configured level resolves to the SAME employee (these
       are computed once from the requester, outside USP_WorkFlow_Routing_Levels'
       per-level loop) -- not useful for testing distinct multi-level chains.
     - WorkflowDefinitionTree is set to a minimal placeholder XML. It's read
       directly (not via TWorkflowDetails) only when BOTH @WorkflowName is
       exactly 'Performance Appraisal'/'Self assessment'/'Goal Setting'/
       'Confirmation Assessment' AND the RequestType is one of the matching
       PMS/CMS types -- this script blocks that exact WorkflowName so you
       always land on the safe, generic role-mapping path regardless of
       @ModulePageName.
     - @ModulePageName must exactly match the literal @PageTitle string the
       target request's creation proc passes to
       SP_CM_GetWorkflowTreeXmlDetailsByPageTitle -- get it from
       ../list-modules-and-pages.sql (live) or ../pagetitle-reference.md
       (source-verified examples) BEFORE running this; an unverified guess
       silently creates a workflow definition nothing ever looks up.
   To remove what this script created, see ./EmployeeLetters.cleanup.sql (or ../cleanup-test-workflow.sql for WorkflowId / bulk).
   ========================================================================== */
SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these, then run the whole script
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT           = 0;              -- <<< existing Employerid in DEV to add this workflow to
DECLARE @ModulePageName   VARCHAR(200)  = 'EmployeeLetters';  -- FIXED for this script -- do not change
DECLARE @WorkflowName     VARCHAR(100)  = 'TEST - My Details - EmployeeLetters';
DECLARE @WorkflowDescription VARCHAR(200) = 'Adhoc test workflow, created by setup-test-workflow.sql';
DECLARE @RoutingLevels    INT           = 1;               -- <<< how many approval levels
DECLARE @WorkflowRoleCode CHAR(1)       = 'U';              -- <<< 'U' = role-based (recommended), 'R' = ReportsTo, 'F' = FunctionalManager
DECLARE @CreatedBy        INT           = 1;                -- <<< an EmployeeId to attribute as creator (audit column only)

-- Role-based ('U') setup ONLY -- pick ONE of the two approaches below, leave the other NULL:
DECLARE @ExistingRoleId      INT = NULL;   -- <<< reuse an existing role, e.g. 6 for 'HR[6]' -- see list-modules-and-pages.sql
DECLARE @NewRoleName         VARCHAR(100) = NULL;  -- <<< OR create a disposable test role with this name instead
DECLARE @ApproverEmployeeId  INT = NULL;   -- <<< required with @NewRoleName: who should approve
DECLARE @RequesterEmployeeId INT = NULL;   -- <<< the employee you'll submit the TEST request as -- required with
                                            --     @NewRoleName (scopes the new role to their BU/Location); optional
                                            --     with @ExistingRoleId (adds a BU/Location mapping for them ONLY if
                                            --     the role isn't already mapped to it -- additive, never removes
                                            --     the role's existing production mappings)

IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId to a real Employerid before running this script.', 1;
IF @RoutingLevels < 1
    THROW 50000, '@RoutingLevels must be >= 1.', 1;
IF @WorkflowRoleCode NOT IN ('R', 'F', 'U')
    THROW 50000, '@WorkflowRoleCode must be ''U'', ''R'', or ''F'' -- see header comment.', 1;
IF @WorkflowName IN ('Performance Appraisal', 'Self assessment', 'Goal Setting', 'Confirmation Assessment')
    THROW 50000, 'Do not use this exact WorkflowName -- it trips a special XML-tree-dependent routing branch. Pick a different name (the default TEST - ... prefix is safe).', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TargetEmployerId)
    THROW 50000, 'TargetEmployerId does not exist in TEmployerDetails.', 1;

IF @WorkflowRoleCode = 'U'
BEGIN
    IF @ExistingRoleId IS NOT NULL AND @NewRoleName IS NOT NULL
        THROW 50000, 'For WorkflowRoleCode = ''U'', set only one of @ExistingRoleId or @NewRoleName (not both).', 1;

    IF @ExistingRoleId IS NULL AND @NewRoleName IS NULL
    BEGIN
        -- Convenience default after setting only @TargetEmployerId: reuse RoleName = 'HR'
        -- (employer-scoped first, else global). Override @ExistingRoleId to pick another role.
        SELECT TOP (1) @ExistingRoleId = R.RoleID
        FROM dbo.TRoles R WITH (NOLOCK)
        WHERE R.IsActive = 'Y'
          AND R.RoleName = 'HR'
          AND (R.Employerid = @TargetEmployerId OR R.IsGlobalAccess = 'Y')
        ORDER BY CASE WHEN R.Employerid = @TargetEmployerId THEN 0 ELSE 1 END, R.RoleID;

        IF @ExistingRoleId IS NULL
            THROW 50000, 'For WorkflowRoleCode = ''U'', set @ExistingRoleId (reuse a role) or @NewRoleName (create one). No active RoleName = ''HR'' was found as a default -- run list-modules-and-pages.sql and set one explicitly.', 1;

        PRINT 'Defaulted @ExistingRoleId to ' + CAST(@ExistingRoleId AS VARCHAR(10)) + ' (RoleName = HR). Set @ExistingRoleId explicitly to use a different role.';
    END
    IF @NewRoleName IS NOT NULL AND (@ApproverEmployeeId IS NULL OR @RequesterEmployeeId IS NULL)
        THROW 50000, '@NewRoleName requires both @ApproverEmployeeId and @RequesterEmployeeId to be set.', 1;
    IF @ExistingRoleId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.TRoles WHERE RoleID = @ExistingRoleId AND (Employerid = @TargetEmployerId OR IsGlobalAccess = 'Y') AND IsActive = 'Y')
        THROW 50000, '@ExistingRoleId not found as an active role for this employer (or global). Check list-modules-and-pages.sql.', 1;
    IF @ApproverEmployeeId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.TEmployee WHERE EmployeeId = @ApproverEmployeeId AND Employerid = @TargetEmployerId)
        THROW 50000, '@ApproverEmployeeId does not exist in this employer.', 1;
    IF @RequesterEmployeeId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.TEmployeeInfo WHERE EmployeeId = @RequesterEmployeeId AND EmployerID = @TargetEmployerId)
        THROW 50000, '@RequesterEmployeeId does not exist in this employer.', 1;
END

DECLARE @ModulePageId INT, @ModuleId INT, @IsWorkflowAvailable BIT;
SELECT @ModulePageId = ModulePageId, @ModuleId = PageModuleId, @IsWorkflowAvailable = IsWorkflowAvailable
FROM dbo.TModulePages
WHERE ModulePageName = @ModulePageName;

IF @ModulePageId IS NULL
    THROW 50000, 'No TModulePages row found with that ModulePageName -- run list-modules-and-pages.sql to confirm the exact live value.', 1;
IF ISNULL(@IsWorkflowAvailable, 0) = 0
    PRINT 'WARNING: TModulePages.IsWorkflowAvailable = 0 for this page -- the app may not surface a workflow-config option for it, even though this script will still create one.';
IF NOT EXISTS (SELECT 1 FROM dbo.THrmsModules WHERE ModuleId = @ModuleId)
    THROW 50000, 'TModulePages.PageModuleId does not resolve to a THrmsModules row -- cannot satisfy TWorkflowManagement''s ModuleId FK.', 1;

IF EXISTS (
    SELECT 1 FROM dbo.TWorkflowManagement
    WHERE Employerid = @TargetEmployerId AND IsDelete = 0 AND isenable = 1
      AND (MappedPages = CAST(@ModulePageId AS VARCHAR(50))
           OR MappedPages LIKE CAST(@ModulePageId AS VARCHAR(50)) + ',%'
           OR MappedPages LIKE '%,' + CAST(@ModulePageId AS VARCHAR(50)) + ',%'
           OR MappedPages LIKE '%,' + CAST(@ModulePageId AS VARCHAR(50))))
    PRINT 'WARNING: an enabled, non-deleted workflow is already mapped to this page for this employer. SP_CM_GetWorkflowTreeXmlDetailsByPageTitle returns the first eligible match, so having two active workflows on the same page may make results ambiguous.';

------------------------------------------------------------------------------
-- 2. RESOLVE OR CREATE THE APPROVER ROLE (only if @WorkflowRoleCode = 'U')
------------------------------------------------------------------------------
DECLARE @ResolvedRoleId INT;

IF @WorkflowRoleCode = 'U'
BEGIN
    IF @NewRoleName IS NOT NULL
    BEGIN
        DECLARE @ReqBU INT, @ReqLoc INT;
        SELECT @ReqBU = BusinessUnitId, @ReqLoc = LocationId FROM dbo.TEmployeeInfo WHERE EmployeeId = @RequesterEmployeeId;
        IF @ReqBU IS NULL OR @ReqLoc IS NULL
            THROW 50000, '@RequesterEmployeeId has no BusinessUnitId/LocationId in TEmployeeInfo -- role-based resolution requires both.', 1;

        INSERT INTO dbo.TRoles (RoleName, IsDefault, createdby, createDate, Employerid, IsActive, IsGlobalAccess)
        VALUES (@NewRoleName, 0, @CreatedBy, GETDATE(), @TargetEmployerId, 'Y', 'N');
        SET @ResolvedRoleId = SCOPE_IDENTITY();

        INSERT INTO dbo.tRoleEmployeeMapping (Roleid, Employeeid, Createdby, Createdate)
        VALUES (@ResolvedRoleId, @ApproverEmployeeId, @CreatedBy, GETDATE());
        INSERT INTO dbo.tRoleBusinessUnitMapping (Roleid, BusinessUnitid, Createdby, Createdate)
        VALUES (@ResolvedRoleId, @ReqBU, @CreatedBy, GETDATE());
        INSERT INTO dbo.tRoleLocationMapping (Roleid, Locationid, Createdby, Createdate)
        VALUES (@ResolvedRoleId, @ReqLoc, @CreatedBy, GETDATE());

        PRINT 'Created test role RoleID = ' + CAST(@ResolvedRoleId AS VARCHAR(10)) + ' (''' + @NewRoleName + '''), approver EmployeeId '
            + CAST(@ApproverEmployeeId AS VARCHAR(10)) + ', scoped to BusinessUnitId ' + CAST(@ReqBU AS VARCHAR(10))
            + ' / LocationId ' + CAST(@ReqLoc AS VARCHAR(10)) + '.';
    END
    ELSE
    BEGIN
        SET @ResolvedRoleId = @ExistingRoleId;

        IF @RequesterEmployeeId IS NOT NULL
        BEGIN
            SELECT @ReqBU = BusinessUnitId, @ReqLoc = LocationId FROM dbo.TEmployeeInfo WHERE EmployeeId = @RequesterEmployeeId;

            IF @ReqBU IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.tRoleBusinessUnitMapping WHERE Roleid = @ResolvedRoleId AND BusinessUnitid = @ReqBU)
            BEGIN
                INSERT INTO dbo.tRoleBusinessUnitMapping (Roleid, BusinessUnitid, Createdby, Createdate)
                VALUES (@ResolvedRoleId, @ReqBU, @CreatedBy, GETDATE());
                PRINT 'Added BusinessUnitId ' + CAST(@ReqBU AS VARCHAR(10)) + ' to RoleID ' + CAST(@ResolvedRoleId AS VARCHAR(10)) + ' (was not already mapped).';
            END
            IF @ReqLoc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.tRoleLocationMapping WHERE Roleid = @ResolvedRoleId AND Locationid = @ReqLoc)
            BEGIN
                INSERT INTO dbo.tRoleLocationMapping (Roleid, Locationid, Createdby, Createdate)
                VALUES (@ResolvedRoleId, @ReqLoc, @CreatedBy, GETDATE());
                PRINT 'Added LocationId ' + CAST(@ReqLoc AS VARCHAR(10)) + ' to RoleID ' + CAST(@ResolvedRoleId AS VARCHAR(10)) + ' (was not already mapped).';
            END
        END
        ELSE
            PRINT 'Reusing existing RoleID ' + CAST(@ResolvedRoleId AS VARCHAR(10)) + ' as-is -- no @RequesterEmployeeId given, so BusinessUnit/Location coverage was not checked. If approval routing finds no approver during testing, verify tRoleBusinessUnitMapping/tRoleLocationMapping cover your test requester.';
    END
END

------------------------------------------------------------------------------
-- 3. CREATE THE WORKFLOW DEFINITION (TWorkflowManagement) -- via the real
--    admin proc, unrestricted by location/business-unit (applies employer-wide)
------------------------------------------------------------------------------
DECLARE @PlaceholderTree VARCHAR(MAX) = N'<?xml version="1.0" encoding="utf-16"?><Tree></Tree>';

-- SP_AdminWM_AddDefinition doesn't OUTPUT the new WorkflowId, so re-select it
-- the same way the proc itself does: MAX for this employer immediately after insert.
EXEC dbo.SP_AdminWM_AddDefinition
    @WorkflowName          = @WorkflowName,
    @WorkflowDescription   = @WorkflowDescription,
    @RoutingLevels          = @RoutingLevels,
    @MappedPages            = @ModulePageId,   -- implicit int->varchar conversion, matches CAST(@ModulePageId AS VARCHAR) used by the lookup procs
    @WorkflowDefinitionTree = @PlaceholderTree,
    @IsDefaultWorkFlow      = 0,
    @IsEnable               = 1,
    @CreatedBy              = @CreatedBy,
    @Employerid             = @TargetEmployerId,
    @ModuleId               = @ModuleId;

DECLARE @WorkflowId INT;
SELECT @WorkflowId = MAX(WorkflowId)
FROM dbo.TWorkflowManagement
WHERE Employerid = @TargetEmployerId AND WorkflowName = @WorkflowName AND CreatedBy = @CreatedBy;

IF @WorkflowId IS NULL
    THROW 50000, 'Could not resolve the newly created WorkflowId -- check SP_AdminWM_AddDefinition ran without error above.', 1;

PRINT 'Created TWorkflowManagement.WorkflowId = ' + CAST(@WorkflowId AS VARCHAR(10))
    + ' mapped to ModulePageId ' + CAST(@ModulePageId AS VARCHAR(10)) + ' (''' + @ModulePageName + ''')'
    + ' for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';

------------------------------------------------------------------------------
-- 4. CREATE ONE TWorkflowDetails ROW PER APPROVAL LEVEL
------------------------------------------------------------------------------
DECLARE @Level INT = 1;
DECLARE @ManagerIdForLevel INT;
WHILE @Level <= @RoutingLevels
BEGIN
    -- EXEC named params must be constants/variables (not expressions).
    -- @ManagerId is the RoleID for WorkflowRole 'U'; unused for 'R'/'F'.
    SET @ManagerIdForLevel = 0;
    IF @WorkflowRoleCode = 'U'
        SET @ManagerIdForLevel = @ResolvedRoleId;

    EXEC dbo.SP_AdminWM_AddDefinitionDet
        @WorkflowId               = @WorkflowId,
        @ManagerId                = @ManagerIdForLevel,
        @WorkflowRole             = @WorkflowRoleCode,
        @WorkflowName             = @WorkflowName,
        @RoutingLevels            = @Level,
        @LevelNotifications       = NULL,
        @ApproversNotifications   = NULL,
        @RejectionNotifications   = NULL,
        @PullbackNotifications    = NULL,
        @CreatedBy                = @CreatedBy;

    IF @WorkflowRoleCode = 'U'
        PRINT 'Level ' + CAST(@Level AS VARCHAR(10)) + ' added: WorkflowRole = ''U'', RoleID = ' + CAST(@ResolvedRoleId AS VARCHAR(10)) + '.';
    ELSE
        PRINT 'Level ' + CAST(@Level AS VARCHAR(10)) + ' added: WorkflowRole = ''' + @WorkflowRoleCode + '''.';
    SET @Level += 1;
END

------------------------------------------------------------------------------
-- 5. SUMMARY
------------------------------------------------------------------------------
PRINT '----------------------------------------------------------------------';
PRINT 'Done. WorkflowId = ' + CAST(@WorkflowId AS VARCHAR(10)) + ', ' + CAST(@RoutingLevels AS VARCHAR(10)) + ' level(s), role = ''' + @WorkflowRoleCode + '''.';
IF @WorkflowRoleCode = 'U'
    PRINT 'To test: submit a ' + @ModulePageName + ' request as an employee whose BusinessUnit/Location is covered by RoleID '
        + CAST(@ResolvedRoleId AS VARCHAR(10)) + ' -- the employee(s) mapped to that role via tRoleEmployeeMapping will see it pending approval.';
ELSE
    PRINT 'To test: submit a ' + @ModulePageName + ' request as an employee in Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10))
        + ' whose ReportsTo/FunctionalManager is a known employee -- that employee will see it pending approval.';
IF @NewRoleName IS NOT NULL
    PRINT 'To remove this workflow, run EmployeeLetters.cleanup.sql with @TargetEmployerId = ' + CAST(@TargetEmployerId AS VARCHAR(10))
        + ' and @RoleIdToDelete = ' + CAST(@ResolvedRoleId AS VARCHAR(10)) + ' (only since you created a NEW disposable role).';
ELSE
    PRINT 'To remove this workflow, run EmployeeLetters.cleanup.sql with @TargetEmployerId = ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';
PRINT '----------------------------------------------------------------------';

IF @WorkflowRoleCode = 'U'
BEGIN
    SELECT rem.Employeeid AS ApproverEmployeeId, e.FName, e.LName
    FROM dbo.tRoleEmployeeMapping rem
    JOIN dbo.TEmployee e ON e.EmployeeId = rem.Employeeid
    WHERE rem.Roleid = @ResolvedRoleId;

    SELECT TOP 20 ei.EmployeeId, e.FName, e.LName, ei.BusinessUnitId, ei.LocationId
    FROM dbo.TEmployeeInfo ei
    JOIN dbo.TEmployee e ON e.EmployeeId = ei.EmployeeId
    WHERE e.Employerid = @TargetEmployerId
      AND ei.BusinessUnitId IN (SELECT BusinessUnitid FROM dbo.tRoleBusinessUnitMapping WHERE Roleid = @ResolvedRoleId)
      AND ei.LocationId IN (SELECT Locationid FROM dbo.tRoleLocationMapping WHERE Roleid = @ResolvedRoleId);
END
ELSE
BEGIN
    -- Candidates for a test requester: employees in this employer with a resolvable manager.
    SELECT TOP 20
        e.EmployeeId, e.FName, e.LName,
        oc.ReportsTo, ei.FunctionalManager
    FROM dbo.TEmployee e
    JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
    LEFT JOIN dbo.TORGChart oc ON oc.EmployeeID = e.EmployeeId
    WHERE e.Employerid = @TargetEmployerId
      AND ((@WorkflowRoleCode = 'R' AND oc.ReportsTo IS NOT NULL)
           OR (@WorkflowRoleCode = 'F' AND ei.FunctionalManager IS NOT NULL));
END
