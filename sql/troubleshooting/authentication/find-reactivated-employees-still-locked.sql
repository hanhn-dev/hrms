-- Confirmed gap: SP_ReActivateEmployee resets TUsers.IsActive = 'Y' and
-- IsLastWorkingDatePast = 0 on rehire, but never resets IsUserIDLocked.
-- Any employee who was auto-locked by the separation job (or locked for any
-- other reason) before being reactivated stays locked after rehire.
--
-- Lists reactivated employees whose account is still locked, so they can be
-- unlocked with unlock-employee-account.sql.
--
-- Required input: none.
-- Read-only.

SELECT
    Employee.EmployeeId,
    Employee.FName,
    Employee.LName,
    EmployeeInfo.reactivationdate,
    EmployeeInfo.Reactiveatedby,
    Users.UserID,
    Users.IsActive AS UserIsActive,
    Users.IsUserIDLocked,
    Users.IsLastWorkingDatePast
FROM dbo.TEmployeeInfo AS EmployeeInfo
JOIN dbo.TEmployee AS Employee
    ON Employee.EmployeeId = EmployeeInfo.EmployeeId
JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.EmployeeID = Employee.EmployeeId
JOIN dbo.TUsers AS Users
    ON Users.UserID = UserEmployee.UserID
WHERE EmployeeInfo.reactivationdate IS NOT NULL
    AND Users.IsUserIDLocked = 'Y'
ORDER BY EmployeeInfo.reactivationdate DESC;
