---
object: FN_CompOffExpiryDate
kind: function
database: hrms
source: HRMS-DATABASE/HRMS/FUNCTIONS/FN_CompOffExpiryDate.sql
last-analyzed: 2026-11-09
---

# FN_CompOffExpiryDate

## What it does

Computes compensatory-off expiry date for an employee and leave type.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | `INT` |
| `@EmployerId` | in | `INT` |
| `@WorkedOn` | in | `DATE` |
| `@LeaveCode` | in | `CHAR(4)` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as FN_CompOffExpiryDate
  participant N0 as UFN_GET_AttendanceCalDateAndShift
  participant N1 as UFN_CM_GetEmployeeCalendarID
  participant N2 as UFN_CM_GetEmployeeCalendarDetails_ApplyLeave
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_AddCompOffRequest` | procedure | No page yet |
| `SP_AddCompOffRequest_Mobile` | procedure | No page yet |
| `SP_AdminLM_LeaveAdjustment` | procedure | [SP_AdminLM_LeaveAdjustment](/docs/database/hrms/SP_AdminLM_LeaveAdjustment) |
| `USP_CompOff_SaveRequest` | procedure | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `UFN_GET_AttendanceCalDateAndShift` | function | Called while this object runs | No page yet |
| `UFN_CM_GetEmployeeCalendarID` | function | Called while this object runs | No page yet |
| `UFN_CM_GetEmployeeCalendarDetails_ApplyLeave` | function | Called while this object runs | No page yet |

## Steps

In `HRMS-DATABASE/HRMS/FUNCTIONS/FN_CompOffExpiryDate.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read or write |
| `TEmployeeInfo` | read or write |
| `TEmployeeRoleMaster` | read or write |
| `TLeaveLapseCarryForwardConfig` | read or write |
| `TLeaveTypeMaster` | read or write |

## Flow

```mermaid
flowchart TD
  Start[FN_CompOffExpiryDate] --> Run[Apply the inputs]
  Run --> Child[UFN_GET_AttendanceCalDateAndShift]
  Child --> Done[Return the result]
```
