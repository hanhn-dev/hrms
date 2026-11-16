---
object: USP_WM_UpsertTaskWithAssignments_V3
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT.sys.sql_modules (not in HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE inventory)
last-analyzed: 2026-11-16
---

# USP_WM_UpsertTaskWithAssignments_V3

## What it does

Transactional create/update of tasks and assignees from `UDT_WM_TaskWithAssignment_V3`. Writes `TWM_Task` / `TWM_TaskAssignments` (and related), then nests history insert and returns refreshed rows via `USP_WM_GetTaskListByTaskIds`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TaskData` | in | Table-valued `UDT_WM_TaskWithAssignment_V3` READONLY |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_UpsertTaskWithAssignments_V3
  participant Hist as USP_WM_InsertTaskWithAssignmentsHistory
  participant List as USP_WM_GetTaskListByTaskIds
  Caller->>Main: execute
  Main->>Hist: execute
  Main->>List: execute
```

## Callers

Work Management Tasks save (catalog). Exact API caller not in SourceCode checkout.

## Nested

| Object | Kind |
|---|---|
| [`USP_WM_InsertTaskWithAssignmentsHistory`](/docs/database/hrm-timeport/USP_WM_InsertTaskWithAssignmentsHistory) | procedure |
| [`USP_WM_GetTaskListByTaskIds`](/docs/database/hrm-timeport/USP_WM_GetTaskListByTaskIds) | procedure |

## Steps

In live DEV `HRM_CL_TIMEPORT.dbo.USP_WM_UpsertTaskWithAssignments_V3`:

1. Opens a transaction and stages `@TaskData` into `#TaskData`.
2. Inserts/updates `TWM_Task` and assignee rows (and related task fields).
3. Nests `USP_WM_InsertTaskWithAssignmentsHistory` for changed guids.
4. Nests `USP_WM_GetTaskListByTaskIds` to return upserted rows.
5. Commits (rolls back / throws on failure).

## Tables

| Table | Read or write |
|---|---|
| `TWM_Task` | write |
| `TWM_TaskAssignments` | write |
| `TWM_Threads` | write |
| `TPROJECT` / `TProject` | read |

## Unresolved calls

None beyond the nested procedures above.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_UpsertTaskWithAssignments_V3] --> Tran[Begin tran]
  Tran --> Write[Write task and assignees]
  Write --> Hist[InsertTaskWithAssignmentsHistory]
  Hist --> List[GetTaskListByTaskIds]
  List --> Done[Commit and return]
```
