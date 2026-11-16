---
object: SP_GetWallOfFame
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_GetWallOfFame.sql
last-analyzed: 2026-11-16
---

# SP_GetWallOfFame

## What it does

Returns Wall of Fame entries for an employer as two result sets: (1) detail rows filtered by optional status, newest first; (2) per-status counts for the whole employer (ignores the status filter). Soft-deleted rows are excluded unless `@Status = 'disabled'`. Invalid employer id throws. Errors return a status/statusCode/message row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope. Must be greater than 0 |
| `@Status` | in | Optional status filter (for example `active`). `disabled` includes deleted rows |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetWallOfFame
  Caller->>Main: execute
  Main-->>Caller: detail rows then status counts
```

## Callers

No other procedure or function executes this object. App callers: `serviceGetWallOfFame` / active-list cache → `GET /rewards/admin/wall-of-fame` from [Recognition Dashboard](/docs/guides/reward-and-recognition/recognition-dashboard) (also Admin Console writes use sibling create/delete SPs).

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_GetWallOfFame.sql`.
2. Reject null or non-positive `@EmployerId`.
3. When `@Status = 'disabled'`, clear the deleted_at filter; otherwise require `deleted_at IS NULL`.
4. Select Wall of Fame columns from `TWallOfFame` with optional status equality, order by `created_at` descending.
5. Second select aggregates pending/approved/rejected/active/completed/expired/disabled/`all` counts for the employer.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TWallOfFame` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_GetWallOfFame] --> Validate[Validate EmployerId]
  Validate --> Filter[Apply status and deleted filters]
  Filter --> Details[Result set 1 detail rows]
  Details --> Counts[Result set 2 status counts]
  Counts --> EndNode[Return both sets]
```
