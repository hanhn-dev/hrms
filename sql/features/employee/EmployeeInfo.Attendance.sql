-- Get employee attendance information by EmployeeId and/or EmploymentNumber.
-- Set one or both identity parameters; NULL identity parameters are ignored.
-- Date range defaults to the current calendar month when not supplied.
DECLARE @EmployeeId INT = 1431,                 -- e.g. 1430
        @EmploymentNumber NVARCHAR(50) = NULL,  -- e.g. 'T0065651'
        @FromDate DATE = NULL,                  -- e.g. '2026-07-01'
        @ToDate DATE = NULL;                     -- e.g. '2026-07-31'

-- Default date range: current month
IF @FromDate IS NULL
    SET @FromDate = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);

IF @ToDate IS NULL
    SET @ToDate = EOMONTH(@FromDate);

-- Resolve employee identity once (supports EmployeeId and/or EmploymentNumber)
DECLARE @ResolvedEmployeeId INT;

SELECT TOP 1
    @ResolvedEmployeeId = TE.EmployeeId
FROM TEmployee AS TE WITH (NOLOCK)
INNER JOIN TEmployeeInfo AS TEI WITH (NOLOCK)
    ON TEI.EmployeeId = TE.EmployeeId
WHERE
    (
        (@EmployeeId IS NOT NULL AND TE.EmployeeId = @EmployeeId)
        OR (@EmploymentNumber IS NOT NULL AND TEI.EmploymentNumber = @EmploymentNumber)
    );

-- ---------------------------------------------------------------------------
-- 1) Employee header
-- ---------------------------------------------------------------------------
SELECT
    TE.EmployeeId,
    TEI.EmploymentNumber,
    TE.Employerid AS EmployerId,
    LTRIM(RTRIM(CONCAT_WS(' ', TE.FName, TE.MiddleName, TE.LName))) AS FullName,
    TE.IsActive,
    TEI.DOJ AS DateOfJoining,
    TEI.DOT AS DateOfTermination,
    TEI.LastWorkingDate,
    SM.ShiftId,
    SM.ShiftName,
    SM.StartTime AS ShiftStartTime,
    SM.EndTime AS ShiftEndTime,
    @FromDate AS FromDate,
    @ToDate AS ToDate
FROM TEmployee AS TE WITH (NOLOCK)
INNER JOIN TEmployeeInfo AS TEI WITH (NOLOCK)
    ON TEI.EmployeeId = TE.EmployeeId
LEFT JOIN TSHIFTMASTER AS SM WITH (NOLOCK)
    ON SM.ShiftId = TEI.ShiftType
WHERE TE.EmployeeId = @ResolvedEmployeeId;

-- ---------------------------------------------------------------------------
-- 2) Day-wise processed attendance (TDailyRegisterNew)
-- ---------------------------------------------------------------------------
SELECT
    DR.RegisterId,
    DR.EmployeeID,
    DR.EmploymentNumber,
    DR.AttendanceDate,
    DR.DayStatus,
    DR.InitialAttendanceStatus,
    DR.ProcessedAttendanceStatus,
    DR.CurrentAttendanceStatus,
    DR.WeeklyAttendanceStatus,
    DR.AttendanceStatus,
    DR.AttendanceNoOfDays,
    DR.LeaveNoOfDays,
    DR.ARNoOfDays,
    DR.WFHNoOfDays,
    DR.FirstPunchIn,
    DR.LastPunchOut,
    DR.TotalMinutes,
    DR.ActualWorkedMinutes,
    DR.BreakMinutes,
    DR.AbsentMinutes,
    DR.ExtraMinutes,
    DR.AdjustedExtraMinutes,
    DR.ARMinutes,
    DR.ProcessedMinutes,
    DR.LateCheckIn,
    DR.EarlyCheckOut,
    DR.InTimeVariation,
    DR.OutTimeVariation,
    DR.ShiftName,
    DR.ShiftGroupName,
    DR.AttendanceBasedOn,
    DR.AttendanceType,
    DR.PendingApproval,
    DR.CheckInCheckOutDetails,
    DR.ProcessedAttendanceComments,
    DR.WeeklyAttendanceComments,
    DR.Comments,
    DR.IsOptionalHoliday,
    DR.LeaveTransID,
    DR.ARTransID,
    DR.WFHTransID,
    DR.CompoffTransId,
    DR.WeekNumber,
    DR.Source,
    DR.CreatedDate,
    DR.UpdatedDate
FROM TDailyRegisterNew AS DR WITH (NOLOCK)
WHERE DR.EmployeeID = @ResolvedEmployeeId
  AND DR.AttendanceDate >= @FromDate
  AND DR.AttendanceDate <= @ToDate
ORDER BY DR.AttendanceDate;

-- ---------------------------------------------------------------------------
-- 3) Aggregated check-in / check-out (TAttendance)
-- ---------------------------------------------------------------------------
SELECT
    A.Transid,
    A.EmployeeId,
    A.AttendanceDate,
    A.CheckInTime,
    A.CheckOutTime,
    A.HoursWorked,
    A.AttendanceStatus,
    A.ShiftId,
    A.InTimeVariation,
    A.OutTimeVariation,
    A.AccessCardId,
    A.MachineIPName,
    A.CardSwapInfo,
    A.CreatedDate,
    A.UpdatedDate
FROM TAttendance AS A WITH (NOLOCK)
WHERE A.EmployeeId = @ResolvedEmployeeId
  AND A.AttendanceDate >= @FromDate
  AND A.AttendanceDate <= @ToDate
ORDER BY A.AttendanceDate, A.CheckInTime;

-- ---------------------------------------------------------------------------
-- 4) Raw punch transactions (TAttendanceTransaction)
-- ---------------------------------------------------------------------------
SELECT
    TAT.Transid,
    TAT.Employeeid AS EmployeeId,
    TAT.AttendanceCalDate,
    TAT.AttendanceDate,
    TAT.In_Out,
    TAT.TransDescription,
    TAT.AttendanceMode,
    TAT.DeviceID,
    TAT.DeviceName,
    TAT.MachineIPName,
    TAT.AccessMachineId,
    TAT.Latitude,
    TAT.Longitude,
    TAT.Description,
    TAT.Comments,
    TAT.IsSync,
    TAT.ACSEmpCode,
    TAT.ACSCardNo,
    TAT.SourceEmployeeid
FROM TAttendanceTransaction AS TAT WITH (NOLOCK)
WHERE TAT.Employeeid = @ResolvedEmployeeId
  AND ISNULL(TAT.AttendanceCalDate, CAST(TAT.AttendanceDate AS DATE)) >= @FromDate
  AND ISNULL(TAT.AttendanceCalDate, CAST(TAT.AttendanceDate AS DATE)) <= @ToDate
ORDER BY TAT.AttendanceDate, TAT.Transid;
