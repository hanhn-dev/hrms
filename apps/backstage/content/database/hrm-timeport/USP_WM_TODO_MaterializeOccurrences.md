---
object: USP_WM_TODO_MaterializeOccurrences
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_MaterializeOccurrences

## What it does

Creates missing future occurrences from a TVP of wanted dates and hard-deletes stale generated rows that no longer match the rule.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | INT |
| `@EmployerId` | in | INT |
| `@Occurrences` | in | UDT_WM_TODO_Occurrences |
| `@Today` | in | DATE (default NULL) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_MaterializeOccurrences
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Begin transaction.
2. Hard-delete stale generated occurrences outside the wanted set.
3. Insert missing wanted occurrences and `created` events.
4. Commit.

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
  Start[USP_WM_TODO_MaterializeOccurrences] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
