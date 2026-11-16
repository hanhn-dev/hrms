---
object: USP_COB_GetDelayCategories
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_COB_GetDelayCategories.sql
last-analyzed: 2026-11-16
---

# USP_COB_GetDelayCategories

## What it does

Returns the active Client Onboarding delay taxonomy (`DelayCategoryId`, `Name`, `SortOrder`) for Audit Trail and planner delay filters.

## Parameters

None.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_COB_GetDelayCategories
  Caller->>Main: execute
  Main->>Main: select active TCOB_DelayCategory
```

## Callers

No other procedure or function calls this object. `PlannerAuditDAL.getDelayCategories` executes it for `GET /api/clientonboard2/delay-categories`.

## Nested

Calls no other procedures or functions.

## Steps

1. Select `DelayCategoryId`, `Name`, and `SortOrder` from `TCOB_DelayCategory` where `IsActive = 1`.

2. Order by `SortOrder`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCOB_DelayCategory` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["USP_COB_GetDelayCategories"] --> Sel["Active categories by SortOrder"]
```
