DECLARE @EmployerId INT = 10;  -- change to your employer

;WITH EmployeesWithPendingActivities AS (
    -------------------------------------------------------------------------
    -- Reporting Manager: has active direct reportees
    -------------------------------------------------------------------------
    SELECT DISTINCT t.ReportsTo AS EmployeeId
    FROM TORGChart t
    INNER JOIN TEmployee e ON t.EmployeeID = e.EmployeeId
        AND e.Employerid = @EmployerId
        AND e.IsActive = 'Y'
    WHERE t.ReportsTo IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Functional Manager: has active functional reportees
    -------------------------------------------------------------------------
    SELECT DISTINCT t.FunctionalManager AS EmployeeId
    FROM TEmployeeInfo t
    INNER JOIN TEmployee e ON t.EmployeeID = e.EmployeeId
        AND t.EmployerID = e.Employerid
        AND e.Employerid = @EmployerId
        AND e.IsActive = 'Y'
    WHERE t.FunctionalManager IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- RRS in process (assigned as recruiter)
    -------------------------------------------------------------------------
    SELECT DISTINCT tr.EmployeeId
    FROM TRecruiter tr
    INNER JOIN TRRStransactionDetails td ON td.RecruiterId = tr.RecruiterId
        AND td.IsActive = 1
    INNER JOIN TRRSDetails r ON r.RRSId = td.RRSId
        AND r.EmployerId = @EmployerId
        AND r.RRSStatus = 'Inprocess'

    UNION

    -------------------------------------------------------------------------
    -- Assigned roles
    -------------------------------------------------------------------------
    SELECT DISTINCT rem.EmployeeId
    FROM TRoleEmployeeMapping rem
    INNER JOIN TRoleManagement rm ON rm.RoleId = rem.RoleId
        AND rm.IsDelete = 0
    INNER JOIN TEmployee e ON rem.EmployeeId = e.EmployeeId
        AND e.Employerid = @EmployerId

    UNION

    -------------------------------------------------------------------------
    -- Pending F&F
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TEmployeeFNFMaster fnf ON rw.RequestTransid = fnf.FNFId
            AND fnf.FNFStatus = 'Pending'
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'EmployeeF&F'
        UNION
        SELECT fnf.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TEmployeeFNFMaster fnf ON rw.RequestTransid = fnf.FNFId
            AND fnf.FNFStatus = 'Pending'
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'EmployeeF&F'
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Leave / Leave cancellation
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TLeaveRequest lr ON rw.RequestTransid = lr.TransId
            AND lr.LeaveStatus IN ('Approved', 'Pending')
        INNER JOIN TLeaveRequestDays lrd ON lrd.LeaveRequestId = lr.TransId
            AND lrd.LeaveStatus IN ('P', 'C')
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('LeaveRequest', 'LeaveCancellation')
        UNION
        SELECT lr.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TLeaveRequest lr ON rw.RequestTransid = lr.TransId
            AND lr.LeaveStatus IN ('Approved', 'Pending')
        INNER JOIN TLeaveRequestDays lrd ON lrd.LeaveRequestId = lr.TransId
            AND lrd.LeaveStatus IN ('P', 'C')
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('LeaveRequest', 'LeaveCancellation')
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Attendance regularization / AR cancellation
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TAttendanceRegularization ar ON rw.RequestTransid = ar.TransId
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('AttendanceRegularize', 'ARCancellation')
        UNION
        SELECT ar.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TAttendanceRegularization ar ON rw.RequestTransid = ar.TransId
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('AttendanceRegularize', 'ARCancellation')
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Work from home / WFH cancellation
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TWorkFromHomeRequest wfh ON rw.RequestTransid = wfh.TransID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('WorkFromHome', 'WFHCancellation')
        UNION
        SELECT wfh.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TWorkFromHomeRequest wfh ON rw.RequestTransid = wfh.TransID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('WorkFromHome', 'WFHCancellation')
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Optional holiday / cancellation
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TOptionalHolidayRequest oh ON rw.RequestTransid = oh.TransID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('OptionalHolidayRequest', 'OptionalHolidayCancellation')
        UNION
        SELECT oh.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TOptionalHolidayRequest oh ON rw.RequestTransid = oh.TransID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('OptionalHolidayRequest', 'OptionalHolidayCancellation')
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Comp-off request / credit
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TComp_OffRequestByEmployee cr ON rw.RequestTransid = cr.CompOffId
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'CompOffRequest'
        UNION
        SELECT cr.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TComp_OffRequestByEmployee cr ON rw.RequestTransid = cr.CompOffId
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'CompOffRequest'
        UNION
        SELECT rw.ManagerId
        FROM TRequestWorkflows rw
        INNER JOIN TCompOffRequest cor ON rw.RequestTransid = cor.TransID
        WHERE rw.RequestType = 'CompOffCreditRequest'
          AND rw.ApproveStatus = 'P'
          AND rw.IsApprove = 0
        UNION
        SELECT cor.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TCompOffRequest cor ON rw.RequestTransid = cor.TransID
        WHERE rw.RequestType = 'CompOffCreditRequest'
          AND rw.ApproveStatus = 'P'
          AND rw.IsApprove = 0
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Overtime / planned OT / OT deviation
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TAttendanceOverTimeRequest ot ON rw.RequestTransid = ot.OverTimeRequestID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.IsDeleted = 0
          AND (
                (rw.RequestType = 'AttendanceOverTime' AND ot.IsActive = 1 AND ot.IsProcessed = 1)
             OR (rw.RequestType = 'Pre-ApprovalOTDeviationRequest' AND ot.IsActive = 1)
          )
        UNION
        SELECT ot.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TAttendanceOverTimeRequest ot ON rw.RequestTransid = ot.OverTimeRequestID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.IsDeleted = 0
          AND (
                (rw.RequestType = 'AttendanceOverTime' AND ot.IsActive = 1 AND ot.IsProcessed = 1)
             OR (rw.RequestType = 'Pre-ApprovalOTDeviationRequest' AND ot.IsActive = 1)
          )
        UNION
        SELECT rw.ManagerId
        FROM TRequestWorkflows rw
        INNER JOIN TPlannedOTRequest pot ON rw.RequestTransid = pot.PlannedOTRequestID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'Pre-ApprovalOTRequest'
          AND rw.IsDeleted = 0
        UNION
        SELECT pot.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TPlannedOTRequest pot ON rw.RequestTransid = pot.PlannedOTRequestID
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'Pre-ApprovalOTRequest'
          AND rw.IsDeleted = 0
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Business card
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TBusinessCards bc ON rw.RequestTransid = bc.BusinessCardId
        INNER JOIN TEmployee e ON bc.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'BusinessCard'
        UNION
        SELECT bc.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TBusinessCards bc ON rw.RequestTransid = bc.BusinessCardId
        INNER JOIN TEmployee e ON bc.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'BusinessCard'
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- Resignation / pullback / resignation activity
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TResignationDetails rd ON rw.RequestTransid = rd.ResignationDetailId
            AND rd.ApproveStatus NOT IN ('Approved', 'Rejected')
            AND rd.IsResignationClose = 0
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('ResignationDetails', 'ResignationPullback')
        UNION
        SELECT rd.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TResignationDetails rd ON rw.RequestTransid = rd.ResignationDetailId
            AND rd.ApproveStatus NOT IN ('Approved', 'Rejected')
            AND rd.IsResignationClose = 0
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType IN ('ResignationDetails', 'ResignationPullback')
        UNION
        SELECT rw.ManagerId
        FROM TRequestWorkflows rw
        INNER JOIN TActivityDetails ad ON rw.RequestTransid = ad.ActivityDetailId
            AND ad.ApproveStatus NOT IN ('C', 'R')
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'ResignationActivity'
        UNION
        SELECT ad.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TActivityDetails ad ON rw.RequestTransid = ad.ActivityDetailId
            AND ad.ApproveStatus NOT IN ('C', 'R')
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'ResignationActivity'
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- PMS: Self assessment (workflow + FormStatus = Pending)
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TPMSEmployeeSelfAppraisal esa ON rw.RequestTransid = esa.TransId
        INNER JOIN TPMSAppraisalCycles ac ON ac.AppraisalCycleId = esa.AppraisalCycleId
        INNER JOIN TEmployee e ON esa.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
            AND e.IsActive = 'Y'
        WHERE ac.IsDeleted = 0
          AND ac.CycleStatus <> 'Closed'
          AND esa.FormStatus <> 'Force Closed'
          AND rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'SelfAssessment'
        UNION
        SELECT esa.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TPMSEmployeeSelfAppraisal esa ON rw.RequestTransid = esa.TransId
        INNER JOIN TPMSAppraisalCycles ac ON ac.AppraisalCycleId = esa.AppraisalCycleId
        INNER JOIN TEmployee e ON esa.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
            AND e.IsActive = 'Y'
        WHERE ac.IsDeleted = 0
          AND ac.CycleStatus <> 'Closed'
          AND esa.FormStatus <> 'Force Closed'
          AND rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType = 'SelfAssessment'
        UNION
        SELECT ec.EmployeeId
        FROM TPMSEmployeeSelfAppraisal ec
        INNER JOIN TPMSAppraisalCycles ac ON ac.AppraisalCycleId = ec.AppraisalCycleId
        INNER JOIN TEmployee e ON ec.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
            AND e.IsActive = 'Y'
        WHERE ac.IsDeleted = 0
          AND ac.CycleStatus <> 'Closed'
          AND ec.FormStatus = 'Pending'
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- PMS: Goal setting
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TPMSEmployeeGoalSetting gs
        INNER JOIN TPMSEmployeeGoalMapping gm ON gm.GoalSettingId = gs.GoalSettingId
        INNER JOIN TRequestWorkflows rw ON rw.RequestTransid = gm.GoalMappingId
        INNER JOIN TPMS_GoalSettingReviewFrequency rf
            ON gm.GoalSettingId = rf.GoalSettingId
           AND gm.ReviewFrequencyId = rf.ReviewFrequencyId
        INNER JOIN TEmployee e ON gm.EmployeeId = e.EmployeeId
            AND e.IsActive = 'Y'
        WHERE gs.IsDeleted = 0
          AND gm.GoalStatus NOT IN ('Closed', 'Pending', 'Force Closed', 'Freezed')
          AND gm.FormApproved = 0
          AND rw.RequestType = 'EmployeeGoalSetting'
          AND rw.ApproveStatus = 'P'
        UNION
        SELECT gm.EmployeeId
        FROM TPMSEmployeeGoalSetting gs
        INNER JOIN TPMSEmployeeGoalMapping gm ON gm.GoalSettingId = gs.GoalSettingId
        INNER JOIN TPMS_GoalSettingReviewFrequency rf
            ON gm.GoalSettingId = rf.GoalSettingId
           AND gm.ReviewFrequencyId = rf.ReviewFrequencyId
        INNER JOIN TEmployee e ON gm.EmployeeId = e.EmployeeId
            AND e.IsActive = 'Y'
        WHERE gs.IsDeleted = 0
          AND gm.GoalStatus NOT IN ('Closed', 'Pending', 'Force Closed', 'Freezed')
          AND gm.FormApproved = 0
    ) x
    WHERE x.EmployeeId IS NOT NULL

    UNION

    -------------------------------------------------------------------------
    -- CMS: Confirmation (workflow + FormStatus = Pending)
    -------------------------------------------------------------------------
    SELECT DISTINCT x.EmployeeId
    FROM (
        SELECT rw.ManagerId AS EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TCMSEmployeeConfirmation ec ON rw.RequestTransid = ec.ConfirmationId
        INNER JOIN TEmployee e ON ec.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
            AND e.IsActive = 'Y'
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType LIKE '%Confirmation%'
        UNION
        SELECT ec.EmployeeId
        FROM TRequestWorkflows rw
        INNER JOIN TCMSEmployeeConfirmation ec ON rw.RequestTransid = ec.ConfirmationId
        INNER JOIN TEmployee e ON ec.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
            AND e.IsActive = 'Y'
        WHERE rw.IsApprove = 0
          AND rw.ApproveStatus = 'P'
          AND rw.RequestType LIKE '%Confirmation%'
        UNION
        SELECT ec.EmployeeId
        FROM TCMSEmployeeConfirmation ec
        INNER JOIN TEmployee e ON ec.EmployeeId = e.EmployeeId
            AND e.Employerid = @EmployerId
            AND e.IsActive = 'Y'
        WHERE ec.FormStatus = 'Pending'
    ) x
    WHERE x.EmployeeId IS NOT NULL
)

SELECT
    e.EmployeeId,
    ei.EmploymentNumber,
    dbo.Fn_GetEmployeeName(e.EmployeeId) AS EmployeeName
FROM TEmployee e
INNER JOIN TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
WHERE e.Employerid = @EmployerId
  AND e.IsActive = 'Y'
  AND e.EmployeeId NOT IN (
      SELECT EmployeeId
      FROM EmployeesWithPendingActivities
      WHERE EmployeeId IS NOT NULL
  )
ORDER BY e.EmployeeId;


SELECT
    e.EmployeeId,
    ei.EmploymentNumber,
    dbo.Fn_GetEmployeeName(e.EmployeeId) AS EmployeeName,
    COUNT(ea.RegisterAssetId) AS AllocatedAssetCount
FROM TEmployee e
INNER JOIN TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
INNER JOIN tEmployeeAssets ea ON ea.EmployeeId = e.EmployeeId
    AND ea.RegisterAssetId IS NOT NULL
WHERE e.Employerid = @EmployerId
  AND e.IsActive = 'Y'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.Fn_GetPendingActivitiesOfEmployee(e.EmployeeId) pa
  )
GROUP BY e.EmployeeId, ei.EmploymentNumber
ORDER BY e.EmployeeId;