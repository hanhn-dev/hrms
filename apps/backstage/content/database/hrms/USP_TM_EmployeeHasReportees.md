---
object: USP_TM_EmployeeHasReportees
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TM_EmployeeHasReportees.sql
last-analyzed: 2026-11-16
---

# USP_TM_EmployeeHasReportees

## What it does

Returns a single-row flag for Task Management UI. If `Fn_DirectIndirectReportee(@ReportsTo, 0)` contains any employee other than `@ReportsTo`, the procedure selects `IsReportee = 1`; otherwise `IsReportee = 0`. The MasterPages shell uses this to show the Team Review accordion and Create Task tab.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ReportsTo` | in | Logged-in employee id to test for reportees |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TM_EmployeeHasReportees
  participant Fn as Fn_DirectIndirectReportee
  Caller->>Main: ReportsTo
  Main->>Fn: ReportsTo RankLevel 0
  Fn-->>Main: reportee rows
  Main-->>Caller: IsReportee 1 or 0
```

## Callers

| Object | Kind | Page |
|---|---|---|
| Task Management API `employeeDAL.CheckEmployeeHasReportees` | application | [Task Management Notifications](/docs/guides/task-management/notifications) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_DirectIndirectReportee` | function | always | [Fn_DirectIndirectReportee](/docs/database/hrms/Fn_DirectIndirectReportee) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TM_EmployeeHasReportees.sql`.
2. `IF EXISTS` over `Fn_DirectIndirectReportee(@ReportsTo, 0)` excluding self.
3. Select `1 AS IsReportee` or `0 AS IsReportee`. No writes.

## Tables

| Table | Read or write |
|---|---|
| (via `Fn_DirectIndirectReportee`) `TORGChart` / employee tables | read |

## Unresolved calls

None at one nested level beyond `Fn_DirectIndirectReportee`.

## Flow

```mermaid
flowchart TD
  Start["USP_TM_EmployeeHasReportees"] --> Fn["Fn_DirectIndirectReportee"]
  Fn --> Has{{"other employees?"}}
  Has -->|yes| One["SELECT IsReportee = 1"]
  Has -->|no| Zero["SELECT IsReportee = 0"]
```
