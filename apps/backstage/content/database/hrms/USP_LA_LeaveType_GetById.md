---
object: USP_LA_LeaveType_GetById
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_GetById.sql
last-analyzed: 2026-11-09
---

# USP_LA_LeaveType_GetById

## What it does

Returns leave-type detail result sets for one `LeaveTransactionId` (and optional policy) for the Leave Policy editor.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveTransactionId` | in | `INT` |
| `@PolicyID` | in | `INT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_LA_LeaveType_GetById
  participant N0 as Fn_GetEmployeeNameByEmployeeID
  participant N1 as UFN_FormatDateTimeStandard
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeNameByEmployeeID` | function | Called while this object runs | [Fn_GetEmployeeNameByEmployeeID](/docs/database/hrms/Fn_GetEmployeeNameByEmployeeID) |
| `UFN_FormatDateTimeStandard` | function | Called while this object runs | [UFN_FormatDateTimeStandard](/docs/database/hrms/UFN_FormatDateTimeStandard) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_GetById.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TLeaveBusinessUnit` | read or write |
| `TLeaveCalendar` | read or write |
| `TLeaveClubWith` | read or write |
| `TLeaveEmployeeStatus` | read or write |
| `tLeaveEventDetails` | read or write |
| `TLeaveGrade` | read or write |
| `TLeaveLapseCarryForwardConfig` | read or write |
| `TLeaveLocation` | read or write |
| `TLeavePolicy` | read or write |
| `TLeavePolicyParameter` | read or write |
| `TLeavePolicyParameterValue` | read or write |
| `TLeaveTypeMaster` | read or write |
| `TLeaveTypeReason` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_LA_LeaveType_GetById] --> Run[Apply the inputs]
  Run --> Child[Fn_GetEmployeeNameByEmployeeID]
  Child --> Done[Return the result]
```
