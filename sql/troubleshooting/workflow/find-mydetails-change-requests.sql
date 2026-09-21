-- =============================================================================
-- find-mydetails-change-requests.sql
--
-- Purpose:  Find ChangeRequestId values for My Details section change
--           requests (TMyDetailsChangeRequests), including pending ones,
--           which section/fields were changed, and who is eligible to
--           approve (pending TRequestWorkflows.ManagerId + name / emp no).
--
-- When to use: you just submitted a My Details edit for review and need the
--           ChangeRequestId and ApproverEmployeeId for
--           diagnose-pending-request.sql or
--           approve-mydetails-change-request.sql.
--
-- Inputs:   Set at least one of @EmployeeId / @EmploymentNumber / @EmployerId.
--           Leave unused filters at 0 / ''.
--
-- Result sets:
--   1) Change-request headers
--   2) Section / field details
--   3) Full workflow queue with approver identity
--   4) Eligible approvers right now (ApproveStatus = 'P') — use as @LoggedInUser
--   5) Workflow definition levels (role / ReportsTo / FunctionalManager)
--
-- Read-only.
--
-- Next steps:
--   diagnose: @RequestType = 'EmploymentTypeChange', @RequestTransId = ChangeRequestId
--   approve:  approve-mydetails-change-request.sql
--             (@ChangeRequestId, @LoggedInUser = ApproverEmployeeId from set 4)
-- =============================================================================

SET NOCOUNT ON;

DECLARE @EmployeeId INT = 1431;              -- subject employee (profile edited)
DECLARE @EmploymentNumber VARCHAR(50) = ''; -- optional alternate lookup
DECLARE @EmployerId INT = 0;              -- optional; 0 = ignore
DECLARE @PendingOnly BIT = 1;             -- 1 = IsApproved IS NULL only
DECLARE @TopRows INT = 50;

IF @EmployeeId <= 0
    AND NULLIF(LTRIM(RTRIM(@EmploymentNumber)), '') IS NULL
    AND @EmployerId <= 0
BEGIN
    THROW 50000, 'Set @EmployeeId, @EmploymentNumber, or @EmployerId before running.', 1;
END;

------------------------------------------------------------------------------
-- Resolve EmployeeId from EmploymentNumber when needed
------------------------------------------------------------------------------
IF @EmployeeId <= 0
    AND NULLIF(LTRIM(RTRIM(@EmploymentNumber)), '') IS NOT NULL
BEGIN
    -- EmploymentNumber lives on TEmployeeInfo (not TEmployee)
    SELECT TOP (1)
        @EmployeeId = EmployeeInfo.EmployeeId
    FROM dbo.TEmployeeInfo AS EmployeeInfo
    INNER JOIN dbo.TEmployee AS Employee
        ON Employee.EmployeeId = EmployeeInfo.EmployeeId
    WHERE EmployeeInfo.EmploymentNumber = @EmploymentNumber
        AND (
            @EmployerId = 0
            OR Employee.Employerid = @EmployerId
        )
    ORDER BY EmployeeInfo.EmployeeId DESC;

    IF @EmployeeId <= 0
    BEGIN
        THROW 50000, 'No employee found for @EmploymentNumber (check @EmployerId if set).', 1;
    END;
END;

------------------------------------------------------------------------------
-- 1) Recent change-request headers
------------------------------------------------------------------------------
SELECT TOP (@TopRows)
    ChangeRequest.ChangeRequestId,
    ChangeRequest.EmployeeId AS SubjectEmployeeId,
    ChangeRequest.EmployerId,
    ChangeRequest.PageName,
    ChangeRequest.RequestedDate,
    ChangeRequest.IsApproved,
    CASE
        WHEN ChangeRequest.IsApproved IS NULL THEN 'Pending'
        WHEN ChangeRequest.IsApproved = 1 THEN 'Approved'
        WHEN ChangeRequest.IsApproved = 0 THEN 'Rejected'
    END AS IsApprovedMeaning,
    ChangeRequest.CreatedBy,
    ChangeRequest.Comments
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
WHERE (
        @EmployeeId = 0
        OR ChangeRequest.EmployeeId = @EmployeeId
    )
    AND (
        @EmployerId = 0
        OR ChangeRequest.EmployerId = @EmployerId
    )
    AND (
        @PendingOnly = 0
        OR ChangeRequest.IsApproved IS NULL
    )
ORDER BY ChangeRequest.ChangeRequestId DESC;

------------------------------------------------------------------------------
-- 2) Same requests with section / field detail
------------------------------------------------------------------------------
SELECT TOP (@TopRows)
    ChangeRequest.ChangeRequestId,
    ChangeRequest.PageName,
    ChangeRequest.RequestedDate,
    CASE
        WHEN ChangeRequest.IsApproved IS NULL THEN 'Pending'
        WHEN ChangeRequest.IsApproved = 1 THEN 'Approved'
        WHEN ChangeRequest.IsApproved = 0 THEN 'Rejected'
    END AS IsApprovedMeaning,
    Detail.SectionName,
    Detail.TableName,
    Detail.FieldName,
    Detail.DBFieldName,
    Detail.TextValueOld,
    Detail.TextValueNew,
    Detail.IsNew
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
LEFT JOIN dbo.TMyDetailsChangeRequestDetails AS Detail
    ON Detail.ChangeRequestId = ChangeRequest.ChangeRequestId
WHERE (
        @EmployeeId = 0
        OR ChangeRequest.EmployeeId = @EmployeeId
    )
    AND (
        @EmployerId = 0
        OR ChangeRequest.EmployerId = @EmployerId
    )
    AND (
        @PendingOnly = 0
        OR ChangeRequest.IsApproved IS NULL
    )
ORDER BY
    ChangeRequest.ChangeRequestId DESC,
    Detail.SectionName,
    Detail.FieldName;

------------------------------------------------------------------------------
-- 3) Full workflow queue (history + pending), with approver identity
------------------------------------------------------------------------------
SELECT TOP (@TopRows)
    Workflow.RequestTransid AS ChangeRequestId,
    Workflow.RequestType,
    Workflow.Transid AS WorkflowQueueTransid,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    CASE Workflow.ApproveStatus
        WHEN 'P' THEN 'Pending — eligible to approve now'
        WHEN 'C' THEN 'Already approved at this step'
        WHEN 'R' THEN 'Rejected'
        WHEN 'B' THEN 'Pullback / superseded'
        ELSE 'Unknown'
    END AS ApproveStatusMeaning,
    Workflow.ManagerId AS ApproverEmployeeId,
    ApproverInfo.EmploymentNumber AS ApproverEmploymentNumber,
    LTRIM(RTRIM(CONCAT(
        ISNULL(Approver.FName, N''),
        N' ',
        ISNULL(Approver.MiddleName, N''),
        N' ',
        ISNULL(Approver.LName, N'')
    ))) AS ApproverName,
    Approver.EmailID AS ApproverEmail,
    Approver.IsActive AS ApproverIsActive,
    Workflow.WorkflowId,
    Workflow.CreatedDate,
    Workflow.Comments
FROM dbo.TRequestWorkflows AS Workflow
INNER JOIN dbo.TMyDetailsChangeRequests AS ChangeRequest
    ON ChangeRequest.ChangeRequestId = Workflow.RequestTransid
LEFT JOIN dbo.TEmployee AS Approver
    ON Approver.EmployeeId = Workflow.ManagerId
LEFT JOIN dbo.TEmployeeInfo AS ApproverInfo
    ON ApproverInfo.EmployeeId = Workflow.ManagerId
WHERE Workflow.RequestType = 'EmploymentTypeChange'
    AND (
        @EmployeeId = 0
        OR ChangeRequest.EmployeeId = @EmployeeId
    )
    AND (
        @EmployerId = 0
        OR ChangeRequest.EmployerId = @EmployerId
    )
    AND (
        @PendingOnly = 0
        OR (
            ChangeRequest.IsApproved IS NULL
            AND Workflow.ApproveStatus = 'P'
            AND ISNULL(Workflow.IsDeleted, 0) = 0
        )
    )
ORDER BY
    Workflow.RequestTransid DESC,
    Workflow.ApprovalLevel,
    Workflow.Transid;

------------------------------------------------------------------------------
-- 4) Eligible approvers RIGHT NOW (pending queue only)
--    Use ApproverEmployeeId as @LoggedInUser in approve-mydetails-change-request.sql
------------------------------------------------------------------------------
SELECT
    Workflow.RequestTransid AS ChangeRequestId,
    ChangeRequest.PageName,
    ChangeRequest.EmployeeId AS SubjectEmployeeId,
    SubjectInfo.EmploymentNumber AS SubjectEmploymentNumber,
    Workflow.ApprovalLevel,
    Workflow.WorkflowId,
    Workflow.ManagerId AS ApproverEmployeeId,
    ApproverInfo.EmploymentNumber AS ApproverEmploymentNumber,
    LTRIM(RTRIM(CONCAT(
        ISNULL(Approver.FName, N''),
        N' ',
        ISNULL(Approver.MiddleName, N''),
        N' ',
        ISNULL(Approver.LName, N'')
    ))) AS ApproverName,
    Approver.EmailID AS ApproverEmail,
    Approver.IsActive AS ApproverIsActive,
    Approver.Employerid AS ApproverEmployerId,
    CASE
        WHEN Approver.EmployeeId IS NULL THEN 'ManagerId not found in TEmployee'
        WHEN ISNULL(Approver.IsActive, 'N') <> 'Y' THEN 'Approver inactive — may still be in queue'
        ELSE 'Eligible — pass this ApproverEmployeeId as @LoggedInUser'
    END AS EligibilityNote
FROM dbo.TRequestWorkflows AS Workflow
INNER JOIN dbo.TMyDetailsChangeRequests AS ChangeRequest
    ON ChangeRequest.ChangeRequestId = Workflow.RequestTransid
LEFT JOIN dbo.TEmployee AS Approver
    ON Approver.EmployeeId = Workflow.ManagerId
LEFT JOIN dbo.TEmployeeInfo AS ApproverInfo
    ON ApproverInfo.EmployeeId = Workflow.ManagerId
LEFT JOIN dbo.TEmployeeInfo AS SubjectInfo
    ON SubjectInfo.EmployeeId = ChangeRequest.EmployeeId
WHERE Workflow.RequestType = 'EmploymentTypeChange'
    AND ChangeRequest.IsApproved IS NULL
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0
    AND (
        @EmployeeId = 0
        OR ChangeRequest.EmployeeId = @EmployeeId
    )
    AND (
        @EmployerId = 0
        OR ChangeRequest.EmployerId = @EmployerId
    )
ORDER BY
    Workflow.RequestTransid DESC,
    Workflow.ApprovalLevel,
    ApproverName;

------------------------------------------------------------------------------
-- 5) Workflow definition levels (who the template routes to)
--    For role-based ('U'), ManagerId on TWorkflowDetails is a RoleId.
--    Live eligible people for the current request are still result set 4 —
--    they were resolved at submit time into TRequestWorkflows.
------------------------------------------------------------------------------
SELECT DISTINCT
    Workflow.RequestTransid AS ChangeRequestId,
    Workflow.WorkflowId,
    Management.WorkflowName,
    Detail.RoutingLevels AS DefinitionLevel,
    Detail.WorkflowRole,
    CASE Detail.WorkflowRole
        WHEN 'U' THEN 'Role-based (ManagerId = RoleId)'
        WHEN 'R' THEN 'ReportsTo'
        WHEN 'F' THEN 'FunctionalManager'
        ELSE 'Other / domain-specific'
    END AS WorkflowRoleMeaning,
    Detail.ManagerId AS RoleOrManagerId,
    Roles.RoleName,
    Detail.WorkflowName AS LevelWorkflowName
FROM dbo.TRequestWorkflows AS Workflow
INNER JOIN dbo.TMyDetailsChangeRequests AS ChangeRequest
    ON ChangeRequest.ChangeRequestId = Workflow.RequestTransid
LEFT JOIN dbo.TWorkflowManagement AS Management
    ON Management.WorkflowId = Workflow.WorkflowId
LEFT JOIN dbo.TWorkflowDetails AS Detail
    ON Detail.WorkflowId = Workflow.WorkflowId
    AND ISNULL(Detail.IsDelete, 0) = 0
LEFT JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = Detail.ManagerId
    AND Detail.WorkflowRole = 'U'
WHERE Workflow.RequestType = 'EmploymentTypeChange'
    AND (
        @EmployeeId = 0
        OR ChangeRequest.EmployeeId = @EmployeeId
    )
    AND (
        @EmployerId = 0
        OR ChangeRequest.EmployerId = @EmployerId
    )
    AND (
        @PendingOnly = 0
        OR ChangeRequest.IsApproved IS NULL
    )
ORDER BY
    Workflow.RequestTransid DESC,
    Detail.RoutingLevels;
