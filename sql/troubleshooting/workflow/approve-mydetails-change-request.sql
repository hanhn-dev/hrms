-- =============================================================================
-- approve-mydetails-change-request.sql
--
-- Purpose:  Force-approve (or reject) a My Details change request by calling
--           Sp_ApproveRejectMyDetailsReview — the same path as
--           dashBoardDAL.ApproveRejectMyDetailsApproval.
--
-- FOOTGUN:  The SP parameter @EmployeeId is MISNAMED. Pass ChangeRequestId
--           there, NOT the employee's EmployeeId. This script uses
--           @ChangeRequestId and maps it correctly.
--
-- @EmployerId: REQUIRED by the SP (filters UPDATEs with EmployerId = @EmployerId
--           and resolves the workflow tree). Leave @EmployerId = 0 to auto-fill
--           from TMyDetailsChangeRequests for this ChangeRequestId. If you set
--           it manually, it MUST match the request's EmployerId or the SP
--           fails / updates nothing. Wrong values often surface as the SP's
--           generic CATCH message: "Failed Due to Transaction Fail! Please
--           Try Again" (the real ERROR_MESSAGE is swallowed inside the SP).
--
-- @LoggedInUser: must be a pending TRequestWorkflows.ManagerId for this
--           request. Leave 0 to auto-pick when exactly one pending manager
--           exists.
--
-- When to use: TMyDetailsChangeRequests rows with IsApproved IS NULL, and
--           matching TRequestWorkflows rows with RequestType typically
--           'EmploymentTypeChange'.
--
-- WRITE script. Prefer a lower environment first. Always run
-- find-mydetails-change-requests.sql / diagnose-pending-request.sql first.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @ChangeRequestId INT = 10290; -- TODO: TMyDetailsChangeRequests.ChangeRequestId
DECLARE @LoggedInUser INT = 1433;    -- TODO: pending ManagerId; 0 = auto-pick if unique
DECLARE @EmployerId INT = 10;      -- TODO: 0 = auto-fill from the change request
DECLARE @RequestType VARCHAR(250) = 'EmploymentTypeChange';
DECLARE @Status VARCHAR(100) = 'Approved'; -- or 'Rejected'
DECLARE @Comments VARCHAR(2000) = 'Force approve via troubleshooting SQL';

IF @ChangeRequestId <= 0
BEGIN
    THROW 50000, 'Set @ChangeRequestId (> 0) before running.', 1;
END;

IF @Status NOT IN ('Approved', 'Rejected')
BEGIN
    THROW 50000, '@Status must be ''Approved'' or ''Rejected''.', 1;
END;

------------------------------------------------------------------------------
-- 1) Load request header — auto-fill EmployerId when left at 0
------------------------------------------------------------------------------
DECLARE @SubjectEmployeeId INT;
DECLARE @RequestEmployerId INT;
DECLARE @RequestIsApproved BIT;
DECLARE @RequestComments VARCHAR(5000);
DECLARE @PageName VARCHAR(250);

SELECT
    @SubjectEmployeeId = ChangeRequest.EmployeeId,
    @RequestEmployerId = ChangeRequest.EmployerId,
    @RequestIsApproved = ChangeRequest.IsApproved,
    @RequestComments = ChangeRequest.Comments,
    @PageName = ChangeRequest.PageName
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
WHERE ChangeRequest.ChangeRequestId = @ChangeRequestId;

IF @SubjectEmployeeId IS NULL
BEGIN
    THROW 50000, 'ChangeRequestId not found in TMyDetailsChangeRequests.', 1;
END;

IF @EmployerId <= 0
BEGIN
    SET @EmployerId = @RequestEmployerId;
END;

IF @EmployerId IS NULL OR @EmployerId <= 0
BEGIN
    THROW 50000, 'Could not resolve @EmployerId from the change request. Set it explicitly.', 1;
END;

IF @EmployerId <> @RequestEmployerId
BEGIN
    THROW 50000, '@EmployerId does not match TMyDetailsChangeRequests.EmployerId for this ChangeRequestId. Leave @EmployerId = 0 to auto-fill, or use the EmployerId from find-mydetails-change-requests.sql.', 1;
END;

IF @RequestIsApproved IS NOT NULL
BEGIN
    THROW 50000, 'This change request is already Approved or Rejected (IsApproved is not NULL).', 1;
END;

IF @RequestComments IS NOT NULL
BEGIN
    -- Sp_ApproveRejectMyDetailsReview filters UPDATEs with Comments IS NULL
    THROW 50000, 'TMyDetailsChangeRequests.Comments is already set; the approve SP will skip this row (Comments IS NULL filter). Clear Comments only if you know what you are doing.', 1;
END;

------------------------------------------------------------------------------
-- 2) Resolve / validate pending approver
------------------------------------------------------------------------------
SELECT
    ChangeRequest.ChangeRequestId,
    ChangeRequest.EmployeeId AS SubjectEmployeeId,
    ChangeRequest.EmployerId,
    ChangeRequest.PageName,
    ChangeRequest.IsApproved,
    ChangeRequest.RequestedDate,
    ChangeRequest.Comments,
    ChangeRequest.CreatedBy
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
WHERE ChangeRequest.ChangeRequestId = @ChangeRequestId;

SELECT
    Workflow.Transid,
    Workflow.RequestTransid,
    Workflow.RequestType,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.WorkflowId,
    Workflow.Comments
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @ChangeRequestId
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;

DECLARE @PendingCount INT;
DECLARE @DistinctManagers INT;

SELECT
    @PendingCount = COUNT(1),
    @DistinctManagers = COUNT(DISTINCT Workflow.ManagerId)
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @ChangeRequestId
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0;

IF @PendingCount = 0
BEGIN
    THROW 50000, 'No pending TRequestWorkflows rows (ApproveStatus = ''P'') for this ChangeRequestId.', 1;
END;

IF @LoggedInUser <= 0
BEGIN
    IF @DistinctManagers = 1
    BEGIN
        SELECT TOP (1)
            @LoggedInUser = Workflow.ManagerId
        FROM dbo.TRequestWorkflows AS Workflow
        WHERE Workflow.RequestType = @RequestType
            AND Workflow.RequestTransid = @ChangeRequestId
            AND Workflow.ApproveStatus = 'P'
            AND ISNULL(Workflow.IsDeleted, 0) = 0
        ORDER BY
            Workflow.ApprovalLevel,
            Workflow.Transid;
    END
    ELSE
    BEGIN
        THROW 50000, 'Multiple pending ManagerIds. Set @LoggedInUser to the ApproverEmployeeId from the SELECT above.', 1;
    END;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TRequestWorkflows AS Workflow
    WHERE Workflow.RequestType = @RequestType
        AND Workflow.RequestTransid = @ChangeRequestId
        AND Workflow.ManagerId = @LoggedInUser
        AND Workflow.ApproveStatus = 'P'
        AND ISNULL(Workflow.IsDeleted, 0) = 0
)
BEGIN
    THROW 50000, '@LoggedInUser is not a pending ManagerId for this request. Use ApproverEmployeeId from the queue SELECT above.', 1;
END;

------------------------------------------------------------------------------
-- 3) Pre-flight: workflow template must resolve for EmployerId + RequestType
------------------------------------------------------------------------------
IF OBJECT_ID(N'tempdb..#tmpFlowDetailsProbe') IS NOT NULL
BEGIN
    DROP TABLE #tmpFlowDetailsProbe;
END;

CREATE TABLE #tmpFlowDetailsProbe (
    WorkflowId INT,
    Tree VARCHAR(MAX),
    SkipWorkFlow BIT
);

INSERT INTO #tmpFlowDetailsProbe
EXEC dbo.SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
    @RequestType,
    @EmployerId,
    @SubjectEmployeeId;

IF NOT EXISTS (SELECT 1 FROM #tmpFlowDetailsProbe WHERE WorkflowId IS NOT NULL)
BEGIN
    DROP TABLE #tmpFlowDetailsProbe;
    THROW 50000, 'No workflow template resolved for this @RequestType + @EmployerId (+ subject employee). Sp_ApproveRejectMyDetailsReview will fail. Check Admin workflow for the My Details page / EmploymentTypeChange.', 1;
END;

SELECT
    @ChangeRequestId AS ChangeRequestId,
    @SubjectEmployeeId AS SubjectEmployeeId,
    @EmployerId AS EmployerIdUsed,
    @LoggedInUser AS LoggedInUserUsed,
    @PageName AS PageName,
    Probe.WorkflowId AS ResolvedWorkflowId
FROM #tmpFlowDetailsProbe AS Probe;

DROP TABLE #tmpFlowDetailsProbe;

------------------------------------------------------------------------------
-- 4) Approve / reject (WRITE via SP)
--    @EmployeeId below IS ChangeRequestId — do not pass the subject employee.
--    On failure the SP returns Message = 'Failed Due to Transaction Fail!...'
--    and rolls back; re-check IsApproved below (still NULL = failed).
------------------------------------------------------------------------------
EXEC dbo.Sp_ApproveRejectMyDetailsReview
    @EmployeeId = @ChangeRequestId,
    @LoggedInUser = @LoggedInUser,
    @EmployerId = @EmployerId,
    @RequestType = @RequestType,
    @Status = @Status,
    @Comments = @Comments;

------------------------------------------------------------------------------
-- 5) Header + queue after
------------------------------------------------------------------------------
SELECT
    ChangeRequest.ChangeRequestId,
    ChangeRequest.EmployeeId AS SubjectEmployeeId,
    ChangeRequest.EmployerId,
    ChangeRequest.IsApproved,
    CASE
        WHEN ChangeRequest.IsApproved IS NULL THEN 'Pending (approve likely failed — see SP Message result set)'
        WHEN ChangeRequest.IsApproved = 1 THEN 'Approved'
        WHEN ChangeRequest.IsApproved = 0 THEN 'Rejected'
    END AS IsApprovedMeaning,
    ChangeRequest.Comments
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
WHERE ChangeRequest.ChangeRequestId = @ChangeRequestId;

SELECT
    Workflow.Transid,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.Comments,
    Workflow.UpdatedDate
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @ChangeRequestId
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;
