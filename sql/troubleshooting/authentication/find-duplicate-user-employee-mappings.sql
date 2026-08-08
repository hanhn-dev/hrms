-- TUserEmployee has no primary key or unique constraint on (UserID,
-- EmployeeID), so duplicate or stale rows are possible. Procs that resolve
-- a user via "SELECT TOP 1 ... WHERE EmployeeId = @EmployeeId" with no
-- ORDER BY (e.g. USP_GETUSERLOCKEDSTATUS) pick a nondeterministic row when
-- more than one exists for the same employee.
--
-- Lists employees mapped to more than one UserID, so a stale mapping can be
-- identified and cleaned up before troubleshooting other lock/login issues.
--
-- Required input: none.
-- Read-only.

SELECT
    UserEmployee.EmployeeID,
    COUNT(*) AS MappedUserCount,
    STRING_AGG(CAST(UserEmployee.UserID AS VARCHAR(20)), ', ') AS UserIds
FROM dbo.TUserEmployee AS UserEmployee
GROUP BY UserEmployee.EmployeeID
HAVING COUNT(*) > 1
ORDER BY MappedUserCount DESC;
