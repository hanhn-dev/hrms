---
object: SP_PMS_UPD_Feedback360NominationSendBack
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360NominationSendBack.sql
last-analyzed: 2026-11-09
---

# SP_PMS_UPD_Feedback360NominationSendBack

## What it does

The approver returns a submitted list to the employee to change.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ParticipantId` | in | `INT` |
| `@EmployeeId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@ModifiedBy` | in | `INT` |

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
2. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360NominationSendBack.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360Nomination` | write |
| `dbo.TPMS_Feedback360Participant` | read |
| `dbo.TPMS_Feedback360Reviewer` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_UPD_Feedback360NominationSendBack] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
