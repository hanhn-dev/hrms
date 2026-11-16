---
object: SP_PMS_UPD_Feedback360DevelopmentPlan
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360DevelopmentPlan.sql
last-analyzed: 2026-11-09
---

# SP_PMS_UPD_Feedback360DevelopmentPlan

## What it does

Save one participant's development plan - the whole list of action

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ParticipantId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@EmployeeId` | in | `INT` |
| `@ModifiedBy` | in | `INT` |
| `@Actions` | in | `see script` |

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
3. Can raise: That participant does not exist for this employer.
4. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360DevelopmentPlan.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360DevelopmentAction` | write |
| `dbo.TPMS_Feedback360DevelopmentPlan` | write |
| `dbo.TPMS_Feedback360Participant` | read |
| `dbo.TPMS_Feedback360Question` | read |
| `dbo.a` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_UPD_Feedback360DevelopmentPlan] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
