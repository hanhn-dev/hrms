---
object: USP_UPD_TCustomerSettings_Feature
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_UPD_TCustomerSettings_Feature.sql
last-analyzed: 2026-11-09
---

# USP_UPD_TCustomerSettings_Feature

## What it does

Updates feature-toggle columns on `TCustomerSettings` for one customer (chat, feedback, attendance mode, management dashboard, attendance-mode icon, forgot-password email attempt limit).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CustomerId` | in | Customer number |
| `@ShowChatModule` | in | Show chat module |
| `@IsShowFeedback` | in | Show feedback |
| `@IsShowAttendanceMode` | in | Show attendance mode |
| `@IsShowManagementDashboard` | in | Show management dashboard |
| `@AttendanceModeIconVisible` | in | Attendance mode icon visible |
| `@MaxAttemptsToSendFrgPwdEmail` | in | Max forgot-password email attempts |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_UPD_TCustomerSettings_Feature
  Caller->>Main: execute
  Main->>Main: update TCustomerSettings for CustomerId
```

## Callers

No other procedure or function calls this object. `UpdateSetupCustomerSetting` executes it when the Customer Config Setup Customer Setting tab maps to this procedure.

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_UPD_TCustomerSettings_Feature.sql`, begin a transaction.
2. Update `TCustomerSettings` for `@CustomerId`, keeping existing values when a parameter is null (`COALESCE` / `ISNULL`).
3. Commit on success; roll back on error.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCustomerSettings` | write |

## Flow

```mermaid
flowchart TD
  Start["USP_UPD_TCustomerSettings_Feature"] --> Upd["Update TCustomerSettings"]
  Upd --> Done["Commit or rollback"]
```
