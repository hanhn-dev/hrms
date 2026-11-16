---
object: USP_WM_TODO_GetAssignedTasks
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_GetAssignedTasks

## What it does

Read-only Work Management task chips for My Planner when both planned dates are set (status from `TWM_Task`).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Today` | in | by |
| `@EmployeeId` | in | INT |
| `@EmployerId` | in | INT |
| `@FromDate` | in | DATE |
| `@ToDate` | in | DATE |
| `@Today` | in | DATE |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_GetAssignedTasks
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Join `TWM_Task` to assignments, status reference, project, and BU mapping.
2. Filter to assignments for the employee with both planned dates overlapping the window.
3. Flag overdue incomplete tasks.

## Tables

| Table | Read or write |
|---|---|
| `TWM_Task` | read |
| `TWM_TaskAssignments` | read |
| `TProject` | read |
| `TWM_ReferenceMaster` | read |
| `TClientProjectMapping` | read |
| `TClient` | read |
| `TClientBusinessUnitMapping` | read |
| `TOrgHierarchyDetails` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_TODO_GetAssignedTasks] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
