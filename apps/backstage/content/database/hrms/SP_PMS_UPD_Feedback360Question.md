---
object: SP_PMS_UPD_Feedback360Question
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360Question.sql
last-analyzed: 2026-11-09
---

# SP_PMS_UPD_Feedback360Question

## What it does

Replace one question - its text, type, competency, role matrix and

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@QuestionId` | in | `INT` |
| `@CampaignId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@QuestionTypeCode` | in | `VARCHAR(20)` |
| `@QuestionText` | in | `NVARCHAR(500)` |
| `@QuestionDescription` | in | `NVARCHAR(1000)` |
| `@CompetencyId` | in | `INT` |
| `@Roles` | in | `see script` |
| `@Options` | in | `see script` |
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
2. Runs mutating work inside a transaction.
3. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360Question.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360Question` | write |
| `dbo.TPMS_Feedback360QuestionOption` | write |
| `dbo.TPMS_Feedback360QuestionRole` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_UPD_Feedback360Question] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
