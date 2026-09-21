-- =============================================================================
-- approve-admin-changes-request.sql
--
-- Purpose:  Force-approve an Admin master-data change request by calling
--           SP_CM_ApproveAdminChangesRequest (runs the dynamic master DML
--           from TAdminChangesApprovalDetails, then flips ActionStatus).
--
-- When to use: TAdminChangesApprovals with ActionStatus = 'Pending' and
--           matching TRequestWorkflows rows for the same ChangeRequestID /
--           RequestType.
--
-- WRITE script. Applies real master-table DML. Prefer a lower environment
-- first. Always run diagnose-pending-request.sql first.
--
-- Inputs:   @RequestType       — TAdminChangesApprovals.RequestType
--           @RequestTransId    — ChangeRequestID
--           @ApproverEmployeeId — pending TRequestWorkflows.ManagerId
--           @EmployerId, @Comments
-- =============================================================================

SET NOCOUNT ON;

DECLARE @RequestType VARCHAR(200) = ''; -- TODO: match TAdminChangesApprovals.RequestType
DECLARE @RequestTransId INT = 0;        -- TODO: ChangeRequestID
DECLARE @ApproverEmployeeId INT = 0;    -- TODO: pending ManagerId (or set 0 to auto-pick)
DECLARE @EmployerId INT = 0;            -- TODO: employer
DECLARE @Comments VARCHAR(1000) = 'Force approve via troubleshooting SQL';

IF NULLIF(LTRIM(RTRIM(@RequestType)), '') IS NULL
    OR @RequestTransId <= 0
    OR @EmployerId <= 0
BEGIN
    THROW 50000, 'Set @RequestType, @RequestTransId (> 0), and @EmployerId (> 0) before running.', 1;
END;

------------------------------------------------------------------------------
-- 1) Admin header + pending queue before
------------------------------------------------------------------------------
SELECT
    AdminApproval.ChangeRequestID,
    AdminApproval.RequestType,
    AdminApproval.PageName,
    AdminApproval.TableName,
    AdminApproval.ActionType,
    AdminApproval.ActionStatus,
    AdminApproval.EmployerId,
    AdminApproval.ActionFor,
    AdminApproval.CreatedBy,
    AdminApproval.CreatedDate
FROM dbo.TAdminChangesApprovals AS AdminApproval
WHERE AdminApproval.ChangeRequestID = @RequestTransId;

IF @@ROWCOUNT = 0
BEGIN
    THROW 50000, 'ChangeRequestID not found in TAdminChangesApprovals.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TAdminChangesApprovals AS AdminApproval
    WHERE AdminApproval.ChangeRequestID = @RequestTransId
        AND AdminApproval.ActionStatus = 'Pending'
)
BEGIN
    THROW 50000, 'TAdminChangesApprovals.ActionStatus is not Pending. Aborting.', 1;
END;

SELECT
    Workflow.Transid,
    Workflow.RequestType,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.WorkflowId,
    Workflow.Comments
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestTransid = @RequestTransId
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;

DECLARE @ResolvedApprover INT = @ApproverEmployeeId;
DECLARE @PendingCount INT;
DECLARE @DistinctManagers INT;

-- Prefer exact RequestType match; fall back to any pending row for this TransId
SELECT
    @PendingCount = COUNT(1),
    @DistinctManagers = COUNT(DISTINCT Workflow.ManagerId)
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestTransid = @RequestTransId
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0
    AND Workflow.RequestType = @RequestType;

IF @PendingCount = 0
BEGIN
    SELECT
        @PendingCount = COUNT(1),
        @DistinctManagers = COUNT(DISTINCT Workflow.ManagerId)
    FROM dbo.TRequestWorkflows AS Workflow
    WHERE Workflow.RequestTransid = @RequestTransId
        AND Workflow.ApproveStatus = 'P'
        AND ISNULL(Workflow.IsDeleted, 0) = 0;
END;

IF @PendingCount = 0
BEGIN
    THROW 50000, 'No pending TRequestWorkflows rows for this ChangeRequestID.', 1;
END;

IF @ResolvedApprover <= 0
BEGIN
    IF @DistinctManagers = 1
    BEGIN
        SELECT TOP (1)
            @ResolvedApprover = Workflow.ManagerId
        FROM dbo.TRequestWorkflows AS Workflow
        WHERE Workflow.RequestTransid = @RequestTransId
            AND Workflow.ApproveStatus = 'P'
            AND ISNULL(Workflow.IsDeleted, 0) = 0
        ORDER BY
            Workflow.ApprovalLevel,
            Workflow.Transid;
    END
    ELSE
    BEGIN
        THROW 50000, 'Multiple pending ManagerIds. Set @ApproverEmployeeId explicitly.', 1;
    END;
END;

SELECT
    @ResolvedApprover AS ApproverEmployeeIdUsed,
    @PendingCount AS PendingRowCountBefore;

------------------------------------------------------------------------------
-- 2) Approve (WRITE via SP — applies master DML)
------------------------------------------------------------------------------
EXEC dbo.SP_CM_ApproveAdminChangesRequest
    @RequestType = @RequestType,
    @RequestTransId = @RequestTransId,
    @EmployeeId = @ResolvedApprover,
    @comments = @Comments,
    @Employerid = @EmployerId;

------------------------------------------------------------------------------
-- 3) Header + queue after
------------------------------------------------------------------------------
SELECT
    AdminApproval.ChangeRequestID,
    AdminApproval.RequestType,
    AdminApproval.ActionStatus,
    AdminApproval.UpdatedBy,
    AdminApproval.Updatedate
FROM dbo.TAdminChangesApprovals AS AdminApproval
WHERE AdminApproval.ChangeRequestID = @RequestTransId;

SELECT
    Workflow.Transid,
    Workflow.RequestType,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.Comments,
    Workflow.UpdatedDate
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestTransid = @RequestTransId
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;
