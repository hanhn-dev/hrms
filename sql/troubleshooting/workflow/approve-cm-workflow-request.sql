-- =============================================================================
-- approve-cm-workflow-request.sql
--
-- Purpose:  Force-approve one pending level of a generic CM workflow request
--           by calling SP_CM_ApproveWorkFlowRequest (same path as the app
--           NotificationDAL.ApproveWorkFlowRequest).
--
-- When to use: Leave, WFH, AR, OH, CompOff, Resignation, Recruitment, PMS,
--           and most ESS types that live in TRequestWorkflows and are handled
--           by SP_CM_ApproveWorkFlowRequest — NOT My Details or Admin masters
--           (use the sibling approve-* scripts for those).
--
-- WRITE script. Runs real domain side effects at final level (leave ledger,
-- attendance register, emails unless skipped, etc.). Prefer a lower
-- environment first. Always run diagnose-pending-request.sql first.
--
-- Inputs:   @RequestType, @RequestTransId, @EmployerId, @Comments
--           @ApproverEmployeeId — set when multiple pending ManagerIds exist;
--             leave 0 to auto-pick when exactly one pending row remains
--           @SkipEmailNotification — default 1 for troubleshooting
--
-- Multi-level: one EXEC advances ONE level. Re-run diagnose / this script
-- for each remaining ApproveStatus = 'P' row. Does not auto-loop.
--
-- Optional type-specific params (uncomment in the EXEC block if needed):
--   @OverTimeDuration, @confirmationStatus, @Noofdays, @CandidateMappingId,
--   @ActualReleavingDate, @AddNoticePeriodLeaves, @HRComments,
--   @IsNewResignation, @RequestDataJson, @ApprovedFrom
-- =============================================================================

SET NOCOUNT ON;

DECLARE @RequestType VARCHAR(50) = ''; -- TODO: e.g. 'LeaveRequest'
DECLARE @RequestTransId INT = 0;       -- TODO: domain PK
DECLARE @EmployerId INT = 0;           -- TODO: employer
DECLARE @Comments VARCHAR(5000) = 'Force approve via troubleshooting SQL';
DECLARE @ApproverEmployeeId INT = 0;   -- 0 = auto-pick when exactly one pending manager
DECLARE @SkipEmailNotification BIT = 1;

-- Optional extras (pass through to SP when non-NULL / non-default)
DECLARE @OverTimeDuration TIME = NULL;           -- required for some OT types
DECLARE @ConfirmationStatus VARCHAR(10) = NULL;  -- Extended / Approved
DECLARE @Noofdays DECIMAL = NULL;
DECLARE @CandidateMappingId INT = NULL;
DECLARE @ActualReleavingDate DATETIME = NULL;
DECLARE @AddNoticePeriodLeaves CHAR(1) = NULL;
DECLARE @HRComments VARCHAR(5000) = NULL;
DECLARE @IsNewResignation VARCHAR(100) = NULL;
DECLARE @RequestDataJson NVARCHAR(MAX) = NULL;
DECLARE @ApprovedFrom VARCHAR(10) = 'Web';

IF NULLIF(LTRIM(RTRIM(@RequestType)), '') IS NULL
    OR @RequestTransId <= 0
    OR @EmployerId <= 0
BEGIN
    THROW 50000, 'Set @RequestType, @RequestTransId (> 0), and @EmployerId (> 0) before running.', 1;
END;

IF @RequestType = 'EmploymentTypeChange'
BEGIN
    THROW 50000, 'My Details requests use approve-mydetails-change-request.sql, not this script.', 1;
END;

------------------------------------------------------------------------------
-- 1) Pending queue before approve
------------------------------------------------------------------------------
SELECT
    Workflow.Transid,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.WorkflowId,
    Workflow.Comments
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @RequestTransId
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;

DECLARE @PendingCount INT;
DECLARE @DistinctManagers INT;
DECLARE @ResolvedApprover INT;

SELECT
    @PendingCount = COUNT(1),
    @DistinctManagers = COUNT(DISTINCT Workflow.ManagerId)
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @RequestTransId
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0;

IF @PendingCount = 0
BEGIN
    THROW 50000, 'No pending TRequestWorkflows rows (ApproveStatus = ''P''). Run diagnose-pending-request.sql.', 1;
END;

IF @ApproverEmployeeId > 0
BEGIN
    SET @ResolvedApprover = @ApproverEmployeeId;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.TRequestWorkflows AS Workflow
        WHERE Workflow.RequestType = @RequestType
            AND Workflow.RequestTransid = @RequestTransId
            AND Workflow.ManagerId = @ResolvedApprover
            AND Workflow.ApproveStatus = 'P'
            AND ISNULL(Workflow.IsDeleted, 0) = 0
    )
    BEGIN
        THROW 50000, '@ApproverEmployeeId is not a pending ManagerId for this request.', 1;
    END;
END
ELSE IF @DistinctManagers = 1
BEGIN
    SELECT TOP (1)
        @ResolvedApprover = Workflow.ManagerId
    FROM dbo.TRequestWorkflows AS Workflow
    WHERE Workflow.RequestType = @RequestType
        AND Workflow.RequestTransid = @RequestTransId
        AND Workflow.ApproveStatus = 'P'
        AND ISNULL(Workflow.IsDeleted, 0) = 0
    ORDER BY
        Workflow.ApprovalLevel,
        Workflow.Transid;
END
ELSE
BEGIN
    THROW 50000, 'Multiple pending ManagerIds. Set @ApproverEmployeeId to the current-level approver from the SELECT above.', 1;
END;

SELECT
    @ResolvedApprover AS ApproverEmployeeIdUsed,
    @PendingCount AS PendingRowCountBefore,
    @DistinctManagers AS DistinctPendingManagers;

------------------------------------------------------------------------------
-- 2) Approve current level (WRITE via SP — no direct status UPDATE)
------------------------------------------------------------------------------
EXEC dbo.SP_CM_ApproveWorkFlowRequest
    @RequestType = @RequestType,
    @RequestTransId = @RequestTransId,
    @EmployeeId = @ResolvedApprover,
    @comments = @Comments,
    @Employerid = @EmployerId,
    @confirmationStatus = @ConfirmationStatus,
    @Noofdays = @Noofdays,
    @CandidateMappingId = @CandidateMappingId,
    @ActualReleavingDate = @ActualReleavingDate,
    @AddNoticePeriodLeaves = @AddNoticePeriodLeaves,
    @HRComments = @HRComments,
    @IsNewResignation = @IsNewResignation,
    @OverTimeDuration = @OverTimeDuration,
    @RequestDataJson = @RequestDataJson,
    @SkipEmailNotification = @SkipEmailNotification,
    @ApprovedFrom = @ApprovedFrom;

------------------------------------------------------------------------------
-- 3) Queue after approve — remaining 'P' means run this script again
------------------------------------------------------------------------------
SELECT
    Workflow.Transid,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.WorkflowId,
    Workflow.Comments,
    Workflow.UpdatedDate
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @RequestTransId
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;

DECLARE @RemainingPending INT = (
    SELECT COUNT(1)
    FROM dbo.TRequestWorkflows AS Workflow
    WHERE Workflow.RequestType = @RequestType
        AND Workflow.RequestTransid = @RequestTransId
        AND Workflow.ApproveStatus = 'P'
        AND ISNULL(Workflow.IsDeleted, 0) = 0
);

SELECT
    @RemainingPending AS RemainingPendingLevels,
    CASE
        WHEN @RemainingPending > 0
            THEN 'Another level is pending. Set @ApproverEmployeeId to the new ManagerId and re-run this script.'
        ELSE 'No pending levels left. Confirm the domain header status separately if needed.'
    END AS NextAction;
