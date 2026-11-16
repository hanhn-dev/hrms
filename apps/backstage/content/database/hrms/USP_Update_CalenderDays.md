---
object: USP_Update_CalenderDays
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_Update_CalenderDays.sql
last-analyzed: 2026-11-06
---

# USP_Update_CalenderDays

## What it does

Called from the Home dashboard path. It changes TCalenderDays, TC and returns the result to its caller.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Year` | in | Year for the attendance or timesheet card (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_Update_CalenderDays
  Caller->>Main: execute
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_DB_EmployeeAttendanceDetails` | procedure | [SP_DB_EmployeeAttendanceDetails](/docs/database/hrms/SP_DB_EmployeeAttendanceDetails) |
| `SP_DB_EmployeeAttendanceFromEmailDetails` | procedure | No page yet |
| `SP_GetEmployeeWeeklyOffDays` | procedure | No page yet |
| `USP_LA_Validate_Leave_FromToDate` | procedure | No page yet |

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_Update_CalenderDays.sql`:

1. Write `TCalenderDays`, `TC`.
2. Return the result set to the caller.

## Tables

| Table | Read or write |
|---|---|
| `TCalenderDays` | read and write |
| `TC` | write |

## Flow

```mermaid
flowchart TD
  Start[USP_Update_CalenderDays] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
