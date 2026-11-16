---
object: USP_WM_TODO_UpsertPlannerSettings
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_UpsertPlannerSettings

## What it does

Merges the employee PlannerDays bitmask (1..127) into `TWM_TODO_PlannerSettings`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | INT |
| `@EmployerId` | in | INT |
| `@PlannerDays` | in | INT |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_UpsertPlannerSettings
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Reject bitmask outside 1..127.
2. MERGE employee/employer settings row.
3. Return saved `PlannerDays`.

## Tables

| Table | Read or write |
|---|---|
| `TWM_TODO_PlannerSettings` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_TODO_UpsertPlannerSettings] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
