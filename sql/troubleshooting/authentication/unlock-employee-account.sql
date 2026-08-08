-- Unlock a locked-out employee's login account (TUsers.IsUserIDLocked).
-- Use when an employee cannot log in because they exceeded the tenant's
-- FailedAttempts threshold (TEmployerDetails.FailedAttempts) — confirm the
-- account is actually locked first with get-employee-login-info.sql.
--
-- Required input: @EmployeeId
-- Write script. Clears IsUserIDLocked and InvalidLoginAttemptCount on
-- TUsers only — does NOT reset the password or write an audit record.
-- For a fully audited unlock (with optional password reset), use the
-- app's stored procedure instead:
-- EXEC dbo.SP_InsLockUnlockemployeeAccount @LockUnLockUserAcc = ...

DECLARE @EmployeeId INT = 0; -- TODO: set EmployeeId before running

-- 1) Review current state before making any change
SELECT
    Users.UserID,
    Users.UserName,
    Users.Employerid,
    Users.IsActive,
    Users.IsUserIDLocked,
    Users.InvalidLoginAttemptCount,
    Users.IsForceToChangePassword,
    Users.PasswordChangedDate
FROM dbo.TUsers AS Users
JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = Users.UserID
WHERE UserEmployee.EmployeeID = @EmployeeId;

-- 2) Unlock: clear the lock flag and reset the failed-attempt counter
BEGIN TRANSACTION;

UPDATE Users
SET
    Users.IsUserIDLocked = 'N',
    Users.InvalidLoginAttemptCount = 0
FROM dbo.TUsers AS Users
JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = Users.UserID
WHERE UserEmployee.EmployeeID = @EmployeeId;

-- Check the affected row(s) above match the expected employee, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

-- 3) Confirm (run after COMMIT)
SELECT
    Users.UserID,
    Users.UserName,
    Users.IsUserIDLocked,
    Users.InvalidLoginAttemptCount
FROM dbo.TUsers AS Users
JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = Users.UserID
WHERE UserEmployee.EmployeeID = @EmployeeId;
