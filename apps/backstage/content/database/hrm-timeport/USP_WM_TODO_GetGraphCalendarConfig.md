---
object: USP_WM_TODO_GetGraphCalendarConfig
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_GetGraphCalendarConfig

## What it does

Resolves enabled Microsoft Graph calendar config for an employer (or EmployerId 0 default).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_GetGraphCalendarConfig
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Prefer employer row; else EmployerId 0 default.
2. Return enabled config including encrypted secret.

## Tables

| Table | Read or write |
|---|---|
| `TWM_TODO_GraphCalendarConfig` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_TODO_GetGraphCalendarConfig] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
