---
object: SP_PMS_INS_Feedback360Campaign
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_INS_Feedback360Campaign.sql
last-analyzed: 2026-11-09
---

# SP_PMS_INS_Feedback360Campaign

## What it does

Create a Draft campaign (wizard "Save as draft", FRD 3.2).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | `INT` |
| `@CampaignName` | in | `NVARCHAR(200)` |
| `@CategoryCode` | in | `VARCHAR(20)` |
| `@CustomCategoryName` | in | `NVARCHAR(100)` |
| `@StartDate` | in | `DATE` |
| `@EndDate` | in | `DATE` |
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
3. Can raise: Campaign name is required.
4. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_INS_Feedback360Campaign.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Campaign` | write |
| `dbo.TPMS_Feedback360CampaignManagerType` | write |
| `dbo.TPMS_Feedback360RatingScalePoint` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_INS_Feedback360Campaign] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
