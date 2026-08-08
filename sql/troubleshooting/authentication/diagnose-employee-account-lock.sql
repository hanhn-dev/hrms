-- One-stop diagnosis for "why can't this employee log in / why did they get
-- locked". Distinguishes between:
--   - failed-login lockout    (InvalidLoginAttemptCount reached the tenant's
--                              FailedAttempts threshold)
--   - separation auto-lock    (SP_SEP_Update_LastWorkingDatePast, driven by
--                              an open TResignationDetails row + shift end
--                              time)
--   - stuck-after-reactivation (SP_ReActivateEmployee clears IsActive and
--                              IsLastWorkingDatePast but does NOT clear
--                              IsUserIDLocked, so a rehired employee can
--                              stay locked)
--
-- Required input: @EmployeeId
-- Read-only.

DECLARE @EmployeeId INT = 0; -- TODO: set EmployeeId before running

-- Account state
SELECT
    Employee.EmployeeId,
    Employee.FName,
    Employee.LName,
    Employee.Employerid,
    Users.UserID,
    Users.IsActive AS UserIsActive,
    Users.IsUserIDLocked,
    Users.InvalidLoginAttemptCount,
    Users.IsForceToChangePassword,
    Users.IsLastWorkingDatePast,
    EmployerDetails.FailedAttempts AS TenantLockoutThreshold
FROM dbo.TEmployee AS Employee
JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.EmployeeID = Employee.EmployeeId
JOIN dbo.TUsers AS Users
    ON Users.UserID = UserEmployee.UserID
LEFT JOIN dbo.TEmployerDetails AS EmployerDetails
    ON EmployerDetails.Employerid = Employee.Employerid
WHERE Employee.EmployeeId = @EmployeeId;

-- Open resignation record (drives the separation auto-lock, if any)
SELECT TOP 1
    Resignation.ResignationDetailId,
    Resignation.LastWorkingDate,
    Resignation.IsResignationClose
FROM dbo.TResignationDetails AS Resignation
WHERE Resignation.EmployeeId = @EmployeeId
    AND Resignation.IsResignationClose = 0
ORDER BY Resignation.ResignationDetailId DESC;

-- Reactivation history (if rehired, IsUserIDLocked may still be 'Y' even
-- though IsActive/IsLastWorkingDatePast were reset — see scenario 3 in
-- README.md)
SELECT
    EmployeeInfo.EmployeeId,
    EmployeeInfo.LastWorkingDate,
    EmployeeInfo.Reactiveatedby,
    EmployeeInfo.reactivationdate,
    EmployeeInfo.reactivationcomment
FROM dbo.TEmployeeInfo AS EmployeeInfo
WHERE EmployeeInfo.EmployeeId = @EmployeeId;
