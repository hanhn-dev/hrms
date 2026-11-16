---
object: USP_WM_TODO_RolloverItems
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_RolloverItems

## What it does

Moves incomplete past-dated to-dos forward to `@Today` under rollover rules; writes rollover events.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | INT |
| `@EmployerId` | in | INT |
| `@Today` | in | DATE |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_RolloverItems
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Identify missed incomplete dated items created before `@Today`.
2. For recurring series, roll only the most recent missed open occurrence when today has none.
3. Update `ScheduledDate` to `@Today` and write events.

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
  Start[USP_WM_TODO_RolloverItems] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
