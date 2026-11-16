---
object: SP_PMS_INS_Feedback360ExternalInvite
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_INS_Feedback360ExternalInvite.sql
last-analyzed: 2026-11-09
---

# SP_PMS_INS_Feedback360ExternalInvite

## What it does

Issue (or re-issue) an external reviewer's sign-in and queue the

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ReviewerId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@PasswordHash` | in | `VARBINARY(32)` |
| `@PasswordSalt` | in | `VARBINARY(16)` |
| `@ExpiresOn` | in | `DATETIME` |
| `@EmailTo` | in | `VARCHAR(500)` |
| `@EmailFrom` | in | `VARCHAR(100)` |
| `@EmailSubject` | in | `VARCHAR(200)` |
| `@EmailBody` | in | `VARCHAR(MAX)` |
| `@CreatedBy` | in | `INT` |

## Call sequence

Calls no other procedures or functions.

## Callers

Application caller: Core API `Feedback360DAL` / `Feedback360Service` for the Performance Assessment → 360° Feedback React module (`Feedback360.aspx`).

| Object | Kind | Page |
|---|---|---|
| _(application)_ | Core API | [360° Feedback guide](/docs/guides/performance-assessment/360-feedback) |

## Nested

Calls no other procedures or functions.

## Steps

1. Sets `XACT_ABORT ON` and `NOCOUNT ON`.
2. Runs mutating work inside a transaction.
3. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_INS_Feedback360ExternalInvite.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmail` | write |
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360ExternalToken` | write |
| `dbo.TPMS_Feedback360Reviewer` | read |
| `dbo.TPMS_Feedback360Submission` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_INS_Feedback360ExternalInvite] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
