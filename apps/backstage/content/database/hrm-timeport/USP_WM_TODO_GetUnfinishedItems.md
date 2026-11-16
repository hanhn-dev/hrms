---
object: USP_WM_TODO_GetUnfinishedItems
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_GetUnfinishedItems

## What it does

Returns every incomplete personal to-do (dated or list) ordered by due date for the Unfinished tab.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | INT |
| `@EmployerId` | in | INT |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_GetUnfinishedItems
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Select incomplete non-deleted items with optional list name and series rule.
2. Order by DueDate, Position.

## Tables

| Table | Read or write |
|---|---|
| `TWM_TodoItems` | read |
| `TWM_TodoLists` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_TODO_GetUnfinishedItems] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
