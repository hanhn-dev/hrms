---
object: USP_COB_GetBaselineTemplates
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_COB_GetBaselineTemplates.sql
last-analyzed: 2026-11-16
---

# USP_COB_GetBaselineTemplates

## What it does

Lists every baseline template version for the Plan Builder grid with module/activity/task counts (excluding IsRemoved) and InUsePlanCount from customer plans that snapshot that version.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| *(none)* | — | — |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_COB_GetBaselineTemplates
  Caller->>Main: execute
  Main->>Main: work
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App callers are listed in the Plan Templates guide.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| *(none)* | — | — | — |

## Steps

1. Select all rows from TCOB_PlanBaselineTemplate.

2. Outer-apply live item counts by Level and count of TCOB_CustomerPlan rows for InUsePlanCount.

3. Order by IsActive descending, then Version descending.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCOB_PlanBaselineTemplate` | read |
| `dbo.TCOB_PlanBaselineItem` | read |
| `dbo.TCOB_CustomerPlan` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["GetBaselineTemplates"] --> List[Select templates]
  List --> Counts[Apply item and plan counts]
  Counts --> Ret[Order active then version]
```
