-- =============================================================================
-- diagnose-pending-request.sql
--
-- Purpose:  Read-only dump of TRequestWorkflows (and a light domain-header
--           check) for one request so you can see pending ManagerId values
--           and which approve-* script to run next.
--
-- When to use: before force-approving a stuck Leave / WFH / My Details /
--           Admin master / other workflow request.
--
-- Inputs:   @RequestType     — exact TRequestWorkflows.RequestType
--                              (e.g. 'LeaveRequest', 'EmploymentTypeChange')
--           @RequestTransId  — domain PK (Leave TransID, ChangeRequestId, …)
--           @EmployerId      — optional filter (0 = ignore)
--
-- Read-only. Does not modify data.
--
-- Next steps:
--   EmploymentTypeChange / My Details  → approve-mydetails-change-request.sql
--   Row also in TAdminChangesApprovals → approve-admin-changes-request.sql
--   Otherwise (CM queue)               → approve-cm-workflow-request.sql
-- =============================================================================

SET NOCOUNT ON;

DECLARE @RequestType VARCHAR(50) = ''; -- TODO: e.g. 'LeaveRequest'
DECLARE @RequestTransId INT = 0;       -- TODO: domain PK
DECLARE @EmployerId INT = 0;           -- optional; 0 = do not filter

IF NULLIF(LTRIM(RTRIM(@RequestType)), '') IS NULL
    OR @RequestTransId <= 0
BEGIN
    ;THROW 50000, 'Set @RequestType and @RequestTransId (> 0) before running.', 1;
END;

------------------------------------------------------------------------------
-- 1) Full queue history for this request
------------------------------------------------------------------------------
SELECT
    Workflow.Transid,
    Workflow.RequestTransid,
    Workflow.RequestType,
    Workflow.ManagerId,
    Workflow.WorkflowId,
    Workflow.ApprovalLevel,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    CASE Workflow.ApproveStatus
        WHEN 'P' THEN 'Pending'
        WHEN 'C' THEN 'Approved'
        WHEN 'R' THEN 'Rejected'
        WHEN 'B' THEN 'PullbackOrSuperseded'
        ELSE 'Unknown'
    END AS ApproveStatusMeaning,
    Workflow.Comments,
    Workflow.RequestForEmployee,
    Workflow.IsDeleted,
    Workflow.IsAutoApprove,
    Workflow.CandidateMappingID,
    Workflow.CreatedDate,
    Workflow.UpdatedDate
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @RequestTransId
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;

------------------------------------------------------------------------------
-- 2) Pending rows only — ManagerId is who must approve (CM / Admin path)
------------------------------------------------------------------------------
SELECT
    Workflow.Transid,
    Workflow.ManagerId AS ApproverEmployeeId,
    Workflow.ApprovalLevel,
    Workflow.WorkflowId,
    Workflow.IsApprove,
    Workflow.ApproveStatus,
    Workflow.Comments,
    Workflow.RequestForEmployee
FROM dbo.TRequestWorkflows AS Workflow
WHERE Workflow.RequestType = @RequestType
    AND Workflow.RequestTransid = @RequestTransId
    AND Workflow.ApproveStatus = 'P'
    AND ISNULL(Workflow.IsDeleted, 0) = 0
ORDER BY
    Workflow.ApprovalLevel,
    Workflow.Transid;

------------------------------------------------------------------------------
-- 3) Which approve script?
------------------------------------------------------------------------------
SELECT
    @RequestType AS RequestType,
    @RequestTransId AS RequestTransId,
    CASE
        WHEN @RequestType = 'EmploymentTypeChange'
            THEN 'approve-mydetails-change-request.sql (Sp_ApproveRejectMyDetailsReview; @EmployeeId = ChangeRequestId)'
        WHEN EXISTS (
            SELECT 1
            FROM dbo.TAdminChangesApprovals AS AdminApproval
            WHERE AdminApproval.ChangeRequestID = @RequestTransId
                AND (
                    AdminApproval.RequestType = @RequestType
                    OR @RequestType = AdminApproval.RequestType
                )
        )
            THEN 'approve-admin-changes-request.sql (SP_CM_ApproveAdminChangesRequest)'
        ELSE 'approve-cm-workflow-request.sql (SP_CM_ApproveWorkFlowRequest)'
    END AS NextScript,
    (
        SELECT COUNT(1)
        FROM dbo.TRequestWorkflows AS Pending
        WHERE Pending.RequestType = @RequestType
            AND Pending.RequestTransid = @RequestTransId
            AND Pending.ApproveStatus = 'P'
            AND ISNULL(Pending.IsDeleted, 0) = 0
    ) AS PendingLevelCount;

------------------------------------------------------------------------------
-- 4) Light domain-header checks (when the RequestType family is known)
------------------------------------------------------------------------------

-- My Details change requests (queue RequestType is usually EmploymentTypeChange)
IF @RequestType = 'EmploymentTypeChange'
BEGIN
    SELECT
        ChangeRequest.ChangeRequestId,
        ChangeRequest.EmployeeId,
        ChangeRequest.EmployerId,
        ChangeRequest.PageName,
        ChangeRequest.IsApproved,
        CASE
            WHEN ChangeRequest.IsApproved IS NULL THEN 'Pending'
            WHEN ChangeRequest.IsApproved = 1 THEN 'Approved'
            WHEN ChangeRequest.IsApproved = 0 THEN 'Rejected'
        END AS IsApprovedMeaning,
        ChangeRequest.RequestedDate,
        ChangeRequest.Comments,
        ChangeRequest.CreatedBy
    FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
    WHERE ChangeRequest.ChangeRequestId = @RequestTransId
        AND (
            @EmployerId = 0
            OR ChangeRequest.EmployerId = @EmployerId
        );
END;

-- Admin master-data change requests
IF EXISTS (
    SELECT 1
    FROM dbo.TAdminChangesApprovals AS AdminApproval
    WHERE AdminApproval.ChangeRequestID = @RequestTransId
)
BEGIN
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
        AdminApproval.CreatedDate,
        AdminApproval.UpdatedBy,
        AdminApproval.Updatedate
    FROM dbo.TAdminChangesApprovals AS AdminApproval
    WHERE AdminApproval.ChangeRequestID = @RequestTransId
        AND (
            @EmployerId = 0
            OR AdminApproval.EmployerId = @EmployerId
        );
END;

-- Common leave / attendance domain headers (columns verified against TABLES/)
IF @RequestType IN (
    'LeaveRequest',
    'LeaveCancellation',
    'ClaimEventLeaveRequest',
    'ClaimEventLeaveCancellation'
)
BEGIN
    SELECT
        LeaveRequest.TransId,
        LeaveRequest.EmployeeId,
        LeaveRequest.LeaveStatus,
        LeaveRequest.Fromdate,
        LeaveRequest.Todate,
        LeaveRequest.Noofdays,
        LeaveRequest.LeaveCode
    FROM dbo.TLeaveRequest AS LeaveRequest
    WHERE LeaveRequest.TransId = @RequestTransId;
END;

IF @RequestType IN ('OptionalHolidayRequest', 'OptionalHolidayCancellation')
BEGIN
    SELECT
        OptionalHoliday.TransId,
        OptionalHoliday.EmployeeId,
        OptionalHoliday.HolidayId,
        OptionalHoliday.Holidaydate,
        OptionalHoliday.HolidayStatus
    FROM dbo.TOptionalHolidayRequest AS OptionalHoliday
    WHERE OptionalHoliday.TransId = @RequestTransId;
END;

IF @RequestType = 'AttendanceRegularize'
BEGIN
    SELECT
        Attendance.TransID,
        Attendance.EmployeeId,
        Attendance.requeststatus,
        Attendance.fromdate,
        Attendance.todate,
        Attendance.Noofdays
    FROM dbo.TAttendanceRegularization AS Attendance
    WHERE Attendance.TransID = @RequestTransId;
END;

IF @RequestType IN ('WorkFromHome', 'WorkFromHomePullback')
BEGIN
    SELECT
        Wfh.TransID,
        Wfh.EmployeeId,
        Wfh.requeststatus,
        Wfh.fromdate,
        Wfh.todate,
        Wfh.noofdays,
        Wfh.Category
    FROM dbo.TWorkFromHomeRequest AS Wfh
    WHERE Wfh.TransID = @RequestTransId;
END;

IF @RequestType IN ('ResignationDetails', 'ResignationActivity')
BEGIN
    SELECT
        Resignation.ResignationDetailId,
        Resignation.EmployeeId,
        Resignation.ApproveStatus,
        Resignation.IsResignationClose,
        Resignation.LastWorkingDate,
        Resignation.RequestedReleavingDate,
        Resignation.ActualReleavingDate
    FROM dbo.TResignationDetails AS Resignation
    WHERE Resignation.ResignationDetailId = @RequestTransId;
END;

-- If no domain branch matched, queue results above are still authoritative.
SELECT
    'If no domain-header result set appeared above, join the domain table'
        + ' manually using RequestTransid as its PK.' AS Note;
