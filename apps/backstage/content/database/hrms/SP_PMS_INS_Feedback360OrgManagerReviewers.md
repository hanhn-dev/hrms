---
object: SP_PMS_INS_Feedback360OrgManagerReviewers
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_INS_Feedback360OrgManagerReviewers.sql
last-analyzed: 2026-11-09
---

# SP_PMS_INS_Feedback360OrgManagerReviewers

## What it does

Seed Manager reviewer rows for a campaign from HRMS org structure,

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CampaignId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@UserId` | in | `INT` |

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
2. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_INS_Feedback360OrgManagerReviewers.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.Candidate` | read |
| `dbo.OnePerHuman` | read |
| `dbo.SoleManager` | read |
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TORGChart` | read |
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360CampaignManagerType` | read |
| `dbo.TPMS_Feedback360Participant` | read |
| `dbo.TPMS_Feedback360Reviewer` | write |
| `dbo.TPMS_Feedback360Submission` | read |
| `dbo.r` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_INS_Feedback360OrgManagerReviewers] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
