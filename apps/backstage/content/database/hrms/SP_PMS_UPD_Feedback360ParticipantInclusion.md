---
object: SP_PMS_UPD_Feedback360ParticipantInclusion
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360ParticipantInclusion.sql
last-analyzed: 2026-11-09
---

# SP_PMS_UPD_Feedback360ParticipantInclusion

## What it does

Include or exclude one employee from a campaign (FRD 3.2 step 3's

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CampaignId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@EmployeeId` | in | `INT` |
| `@IsIncluded` | in | `BIT` |
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

1. Runs the statements in the procedure body and returns result sets.
2. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360ParticipantInclusion.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360Participant` | read |
| `dbo.p` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_UPD_Feedback360ParticipantInclusion] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
