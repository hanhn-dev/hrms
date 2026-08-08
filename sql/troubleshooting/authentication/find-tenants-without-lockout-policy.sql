-- Finds tenants where the failed-login lockout threshold is not configured,
-- so SP_UpdateInvalidLoginAttemptCount / SP_LOG_UpdInvalidLoginAttemptCount
-- can never auto-lock an account for that tenant. Those procs compare
-- InvalidLoginAttemptCount to FailedAttempts with exact equality, and NULL
-- never equals anything in T-SQL, so a NULL FailedAttempts silently
-- disables lockout for the whole tenant.
--
-- Use when a tenant reports "accounts never lock even after many bad
-- password attempts."
--
-- Required input: none (scans all tenants). Optionally narrow to one
-- @EmployerId below.
-- Read-only.

DECLARE @EmployerId INT = NULL; -- TODO: set to check one tenant, or leave NULL for all

SELECT
    EmployerDetails.Employerid,
    EmployerDetails.EmployerName,
    EmployerDetails.FailedAttempts,
    EmployerDetails.IsActive
FROM dbo.TEmployerDetails AS EmployerDetails
WHERE EmployerDetails.FailedAttempts IS NULL
    AND (EmployerDetails.Employerid = @EmployerId OR @EmployerId IS NULL)
ORDER BY EmployerDetails.EmployerName;
