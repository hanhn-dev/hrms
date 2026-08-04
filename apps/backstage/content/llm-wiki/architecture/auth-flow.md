---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TUsers.sql
  - HRMS-DATABASE/HRMS/TABLES/TDeviceInvalidLoginAttemptDetails.sql
  - HRMS-DATABASE/HRMS/TABLES/TEmployerDetails.sql
  - HRMS-DATABASE/HRMS/TABLES/TRoles.sql
  - HRMS-DATABASE/HRMS/TABLES/TuserPasswordHistory.sql
confidence: medium
last-analyzed: 2026-06-26
---

# Authentication & Authorization Flow

How identity and access work, as far as the database reveals. **Password
verification and session issuance happen in the application tier**; the database
stores the credential record, policy, role/page mapping, and audit.

## Identity model

- **`TUsers`** is the login principal (PK `UserID`), distinct from `TEmployee`.
  Key columns (`TUsers.sql`): `UserName`, `PasswordStr VARCHAR(200)` (stored
  credential — algorithm set by the app tier, see open questions), `UserEmail`,
  `RoleID → TRoles(RoleID)` (`:24`), `Employerid` (tenant), `UserType CHAR(1)
  DEFAULT 'E'`, `WinLoginName` (Windows/AD login — implies optional integrated
  auth), `IsActive`, `UUID UNIQUEIDENTIFIER`.
- **`TUserEmployee`** links a user to an employee record.
- **`TUsersHistory`** / **`TuserPasswordHistory`** retain prior user and password
  records (supports the `PreventPasswords` reuse policy).

## Account-security state (on `TUsers`)

`InvalidLoginAttemptCount`, `IsUserIDLocked CHAR(1)`, `IsForceToChangePassword
CHAR(1)`, `PasswordChangedDate` (`TUsers.sql:15-18`). The tenant-level policy
that drives these lives on `TEmployerDetails`: `PasswordExpires`,
`PasswordChangelimit`, `PreventPasswords`, `FailedAttempts`,
`PasswordExpirationAlert` (`TEmployerDetails.sql:23-29`).

## Invalid-login / device audit

`TDeviceInvalidLoginAttemptDetails` records failed attempts per
`(EmployerId, EmployeeId, DeviceId)` with `LoginAttemptedAt` and `Reason`
(`TDeviceInvalidLoginAttemptDetails.sql:1-11`). The default timestamp is
`DATEADD(MINUTE, 330, GETUTCDATE())` = **UTC+5:30 (IST)** (`:6`) — a hardcoded
India offset (see open questions / inferred context). Indexed for newest-first
lookup per device (`:14`).

## Authorization (page/tab-level access control)

Access is role-based and page-granular:

- `TRoles` (per-tenant) with `IsGlobalAccess`, `ReportingType`.
- `TRolePagesMapping` / `TRoleBasePagesAccess` — which pages a role can access.
- `TRoleTabDetails` — tab-level access within a page.
- `TUSerPagesMapping` / `TUserTabDetails` — per-user overrides.
- `TModulePages` — the catalog of pages (also the join key for workflow mapping).

## Flow (reconstructed; app-tier steps are inferred)

```mermaid
sequenceDiagram
  participant U as User (browser/mobile)
  participant App as App tier (ASP.NET)
  participant DB as HRMS_PROD
  U->>App: submit credentials (+ DeviceId)
  App->>DB: fetch TUsers by UserName/Employerid
  App->>App: verify PasswordStr (algorithm app-side)
  alt invalid
    App->>DB: INSERT TDeviceInvalidLoginAttemptDetails; bump InvalidLoginAttemptCount
    App->>App: lock (IsUserIDLocked) when FailedAttempts policy exceeded
  else valid
    App->>App: issue session (app-side)
    App->>DB: INSERT TAuditTrail (SessionID, PageName, UserName, AccessTime)
    App->>DB: load role/page access (TRolePagesMapping / TUSerPagesMapping)
  end
```

> The password hashing scheme, session/token format, and SSO/AD integration
> details are not in the DB. See `../assumptions/open-questions.md`.
