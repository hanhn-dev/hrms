-- Login/account-security info for a given employee: identity, role,
-- lock/password-policy state, tenant policy, and recent failed-login
-- attempts. Use to confirm whether an account is actually locked before
-- running unlock-employee-account.sql, or to diagnose a login complaint.
--
-- Required input: @EmployeeId
-- Read-only.
--
-- Password hashing and session issuance happen in the app tier, not here —
-- this only shows what the DB tracks (see llm-wiki/architecture/auth-flow.md
-- in the TDG HRMS DB repo for the full model).

DECLARE @EmployeeId INT = 0; -- TODO: set EmployeeId before running

-- Identity, role, and account-security state
SELECT
    Employee.EmployeeId,
    Employee.FName,
    Employee.MiddleName,
    Employee.LName,
    Employee.EmailID,
    Users.UserID,
    Users.UserName,
    Users.UserEmail,
    Users.UserType,
    Users.WinLoginName,
    Users.IsActive AS UserIsActive,
    Roles.RoleName,
    Users.IsUserIDLocked,
    Users.InvalidLoginAttemptCount,
    Users.IsForceToChangePassword,
    Users.PasswordChangedDate,
    Users.CreatedDate AS UserCreatedDate,
    Users.ModifiedDate AS UserModifiedDate
FROM dbo.TEmployee AS Employee
JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.EmployeeID = Employee.EmployeeId
JOIN dbo.TUsers AS Users
    ON Users.UserID = UserEmployee.UserID
LEFT JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = Users.RoleID
WHERE Employee.EmployeeId = @EmployeeId;

-- Tenant-level password/lockout policy that governs the account above
SELECT
    EmployerDetails.Employerid,
    EmployerDetails.PasswordExpires,
    EmployerDetails.PasswordChangelimit,
    EmployerDetails.PreventPasswords,
    EmployerDetails.FailedAttempts,
    EmployerDetails.PasswordExpirationAlert
FROM dbo.TEmployerDetails AS EmployerDetails
JOIN dbo.TEmployee AS Employee
    ON Employee.Employerid = EmployerDetails.Employerid
WHERE Employee.EmployeeId = @EmployeeId;

-- Recent failed login attempts (device/audit trail)
-- NB: LoginAttemptedAt is stored as IST (UTC+5:30), not UTC or server-local time.
SELECT TOP 20
    DeviceLoginAttempt.DeviceLoginAttemptId,
    DeviceLoginAttempt.DeviceId,
    DeviceLoginAttempt.LoginAttemptedAt,
    DeviceLoginAttempt.Reason
FROM dbo.TDeviceInvalidLoginAttemptDetails AS DeviceLoginAttempt
WHERE DeviceLoginAttempt.EmployeeId = @EmployeeId
ORDER BY DeviceLoginAttempt.LoginAttemptedAt DESC;
