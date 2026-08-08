# Authentication Troubleshooting

Scenarios worth checking when an employee can't log in, gets locked out
unexpectedly, or stays locked when they shouldn't. Grounded in the actual
stored-procedure logic (file:line references point at
`HRMS-DATABASE/HRMS/STOREPROCEDURE/` and `HRMS-DATABASE/HRMS/TABLES/` in the
`TDG HRMS DB` repo). See that repo's `llm-wiki/architecture/auth-flow.md` for
the full identity/authorization model — password hashing and session
issuance happen in the app tier, not here.

## Scenarios

1. **Tenant has no configured lockout threshold.**
   `SP_UpdateInvalidLoginAttemptCount.sql:54` locks an account only on exact
   equality (`IF @Lv_FailedAttempts = @Lv_InvalidLoginAttemptCount`). If
   `TEmployerDetails.FailedAttempts` is `NULL` for that tenant, the
   comparison is never true, so accounts can never auto-lock no matter how
   many bad attempts occur.
   → `find-tenants-without-lockout-policy.sql`

2. **Employee locked by the separation batch job, not by failed logins.**
   `SP_SEP_Update_LastWorkingDatePast.sql` auto-sets
   `IsLastWorkingDatePast = 1` and `IsUserIDLocked = 'Y'` once GETDATE()
   passes the *open* resignation record's `LastWorkingDate` (from
   `TResignationDetails`, most recent row where `IsResignationClose = 0`)
   plus the employee's shift end time (`TShiftMaster` via
   `UFN_GET_EmployeeShift`). A wrong `LastWorkingDate` on the resignation
   record, or a resignation that was never marked closed, locks an
   otherwise-active employee.
   → `diagnose-employee-account-lock.sql`

3. **Reactivated (rehired) employee stays locked.** Confirmed gap:
   `SP_ReActivateEmployee.sql:93-98` resets `TUsers.IsActive = 'Y'` and
   `IsLastWorkingDatePast = 0` on rehire, but never resets
   `IsUserIDLocked`. Anyone auto-locked by scenario 2 before being rehired
   stays locked after reactivation.
   → `find-reactivated-employees-still-locked.sql`, then
     `unlock-employee-account.sql` to fix.

4. **Inactive account mistaken for a locked account.**
   `SP_CheckUser.sql:42` requires `IsActive = 'Y'` in addition to the
   password/lock checks. `IsActive` and `IsUserIDLocked` are independent
   gates — support often checks only the lock flag.
   → `get-employee-login-info.sql` (shows both).

5. **Duplicate/stale `TUserEmployee` mappings.** The table has no primary
   key or unique constraint on `(UserID, EmployeeID)`. Procs that resolve a
   user with `SELECT TOP 1 ... WHERE EmployeeId = @EmployeeId` and no
   `ORDER BY` (e.g. `USP_GETUSERLOCKEDSTATUS.sql:26`) pick a
   nondeterministic row when more than one exists for the same employee —
   an unlock or lookup can silently target the wrong `UserID`.
   → `find-duplicate-user-employee-mappings.sql`

6. **AD/Windows-integrated login follows a different path.**
   `TUsers.WinLoginName` plus `SP_LOG_CheckUser_ExternalLogin.sql` is a
   separate check from the password path in `SP_CheckUser.sql`. A user who
   normally logs in via SSO/AD won't show a `PasswordStr`-related failure —
   troubleshooting steps differ.

7. **Password reuse / forced-change loops.** `TuserPasswordHistory` +
   `TEmployerDetails.PreventPasswords` reject reused passwords;
   `IsForceToChangePassword = 'Y'` can trap a user in a change-password
   redirect if that app-side flow errors out.
   → `get-employee-login-info.sql` (shows `IsForceToChangePassword`).

8. **Failed-login timestamps are IST, not UTC.**
   `TDeviceInvalidLoginAttemptDetails.LoginAttemptedAt` defaults to
   `DATEADD(MINUTE, 330, GETUTCDATE())` — hardcoded India offset. Comparing
   these timestamps directly against UTC/server-time app or ELMAH logs will
   look off by 5.5 hours.
   → `get-employee-login-info.sql` (results include a reminder in-script).

## Ruled out

- **Cross-tenant `EmployeeId` collision in `SP_InsLockUnlockemployeeAccount`**
  (its `WHERE` clause has the `EmployerId` filter commented out, matching
  only on `employeeid`). Initially flagged as a risk, but `TEmployee.EmployeeId`
  is a single global `IDENTITY` primary key — not composite with
  `Employerid` — so it cannot collide across tenants within this database.
  Not a real issue; no script needed.

## Scripts in this folder

| Script | Type | Scenario(s) |
|---|---|---|
| `get-employee-login-info.sql` | read-only | 4, 7, 8 |
| `unlock-employee-account.sql` | write | fix for 1-3 |
| `find-tenants-without-lockout-policy.sql` | read-only | 1 |
| `diagnose-employee-account-lock.sql` | read-only | 2, 3 |
| `find-reactivated-employees-still-locked.sql` | read-only | 3 |
| `find-duplicate-user-employee-mappings.sql` | read-only | 5 |
