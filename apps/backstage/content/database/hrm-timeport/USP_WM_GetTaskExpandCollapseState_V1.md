---
object: USP_WM_GetTaskExpandCollapseState_V1
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT.sys.sql_modules (not in HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE inventory)
last-analyzed: 2026-11-16
---

# USP_WM_GetTaskExpandCollapseState_V1

## What it does

Reads the single `ExpandedTaskIds` blob for employer/project/employee/BU/page type.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer id (`INT`) |
| `@ProjectId` | in | Project id (`INT`) |
| `@EmployeeId` | in | Employee id (`INT`) |
| `@BusinessUnitId` | in | Business unit id (`INT`) |
| `@PageType` | in | Page key (`VARCHAR(50)`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_GetTaskExpandCollapseState_V1
  Caller->>Main: execute
```

## Callers

Catalog `GET /tasks/expand-collapse-state` for Tasks.

## Nested

This object does not execute another procedure.

## Steps

In live DEV `HRM_CL_TIMEPORT.dbo.USP_WM_GetTaskExpandCollapseState_V1`:

1. Selects `TOP 1 ExpandedTaskIds` from `TWM_TaskExpandCollapseState` for the key tuple.

## Tables

| Table | Read or write |
|---|---|
| `TWM_TaskExpandCollapseState` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_GetTaskExpandCollapseState_V1] --> Done[Return ExpandedTaskIds]
```
