---
object: SP_RnR_Budget_GetOrganisationPool
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_RnR_Budget_GetOrganisationPool.sql
last-analyzed: 2026-11-16
---

# SP_RnR_Budget_GetOrganisationPool

## What it does

Ensures an organisation pool row exists for the employer, then returns available/lifetime balances plus derived lifetime DirectIssue and PointRequest allocation totals, and direct-issue settings.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_RnR_Budget_GetOrganisationPool
  Caller->>Main: execute
  Main-->>Caller: pool summary row
```

## Callers

Called by `SP_RnR_Budget_FundOrganisationPool`. Also expected as a direct Organisation Pool read from [Admin Console](/docs/guides/reward-and-recognition/admin-console).

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_RnR_Budget_GetOrganisationPool.sql`.
2. Insert empty pool row if missing.
3. Aggregate DirectIssue and PointRequest allocation movements.
4. Select pool balances and settings.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRnROrganisationPool` | read/write (ensure insert) |
| `dbo.TRnROrganisationPoolMovement` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_RnR_Budget_GetOrganisationPool] --> Ensure[Ensure pool row]
  Ensure --> Agg[Aggregate movement totals]
  Agg --> EndNode[Return pool]
```
