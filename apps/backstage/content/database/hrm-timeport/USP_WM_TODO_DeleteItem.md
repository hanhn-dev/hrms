---
object: USP_WM_TODO_DeleteItem
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_DeleteItem

## What it does

Soft-deletes one occurrence, following occurrences, or a whole recurrence series for the owning employee; writes `deleted` events.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TodoItemId` | in | INT |
| `@EmployeeId` | in | INT |
| `@EmployerId` | in | INT |
| `@Scope` | in | VARCHAR |
| `@Today` | in | DATE (default NULL) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_DeleteItem
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Validate `@Scope` (`one` / `following` / `series`).
2. Resolve series identity from recurrence parent/rule.
3. Soft-delete the scoped rows and insert `deleted` events.

## Tables

| Table | Read or write |
|---|---|
| `TWM_TodoItems` | write |
| `TWM_TodoItemEvents` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_TODO_DeleteItem] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
