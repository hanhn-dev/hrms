---
object: FN_Get_EmployeeTotalWorkedMinute
kind: function
database: hrms
source: HRMS-DATABASE/HRMS/FUNCTIONS/FN_Get_EmployeeTotalWorkedMinute.sql
last-analyzed: 2026-11-16
---

# FN_Get_EmployeeTotalWorkedMinute

## What it does

Returns total worked minutes for one employee on one attendance date (including night-shift and undefined-shift handling). Used by `SP_LeaveAttendance_DashBoard` when building swipe / attendance trend cards.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AttendanceDate` | in | Attendance calendar date (or date-time) to evaluate |
| `@EmployeeId` | in | Employee whose punches and shift apply |

Returns `INT` minutes.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as FN_Get_EmployeeTotalWorkedMinute
  participant N0 as FN_GetLocalTime
  participant N1 as UFN_GET_AttendanceCalDateAndShift
  participant N2 as UFN_GetShiftIdBasedOnEmployeeIdAttendanceDate
  Caller->>Main: execute
  Main->>N0: local time for shift lookup
  Main->>N1: calendar date and shift from punch window
  Main->>N2: shift id when attendance time is midnight
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_LeaveAttendance_DashBoard` | procedure | [SP_LeaveAttendance_DashBoard](/docs/database/hrms/SP_LeaveAttendance_DashBoard) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `FN_GetLocalTime` | function | resolve employer-local now | [FN_GetLocalTime](/docs/database/hrms/FN_GetLocalTime) |
| `UFN_GET_AttendanceCalDateAndShift` | function | map punch/datetime to attendance calendar day and shift | No page yet |
| `UFN_GetShiftIdBasedOnEmployeeIdAttendanceDate` | function | when `@AttendanceDate` has midnight time | No page yet |

## Steps

1. Read script `HRMS-DATABASE/HRMS/FUNCTIONS/FN_Get_EmployeeTotalWorkedMinute.sql`.
2. Resolve current local attendance calendar date/time via `UFN_GET_AttendanceCalDateAndShift` / `FN_GetLocalTime`.
3. Resolve `@lv_ShiftID` and attendance calendar date from `@AttendanceDate` (midnight vs timed path).
4. Load shift window from `TSHIFTMASTER` (early-in / late-out and next-day end).
5. Apply configurable attendance-duration rules and sum punch minutes into `@lv_TotalWorkedMinute`.
6. Return the integer minute total.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TSHIFTMASTER` | read |
| `dbo.TAttendanceTransaction` (via helpers / body) | read |

## Flow

```mermaid
flowchart TD
  Start[FN_Get_EmployeeTotalWorkedMinute] --> Shift[Resolve shift and calendar date]
  Shift --> Window[Build shift start/end window]
  Window --> Sum[Sum worked minutes from punches]
  Sum --> Out[Return INT minutes]
```
