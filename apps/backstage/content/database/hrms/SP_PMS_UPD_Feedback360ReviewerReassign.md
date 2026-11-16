---
object: SP_PMS_UPD_Feedback360ReviewerReassign
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360ReviewerReassign.sql
last-analyzed: 2026-11-09
---

# SP_PMS_UPD_Feedback360ReviewerReassign

## What it does

Replace one reviewer with another, keeping their place in the grid.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CampaignId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@ReviewerId` | in | `INT` |
| `@NewReviewerEmployeeId` | in | `INT` |
| `@NewExternalName` | in | `NVARCHAR(200)` |
| `@NewExternalEmail` | in | `NVARCHAR(256)` |
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
3. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_UPD_Feedback360ReviewerReassign.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360Reviewer` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_UPD_Feedback360ReviewerReassign] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
