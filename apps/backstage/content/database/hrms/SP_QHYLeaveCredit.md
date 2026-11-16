---
object: SP_QHYLeaveCredit
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_QHYLeaveCredit.sql
last-analyzed: 2026-11-09
---

# SP_QHYLeaveCredit

## What it does

Runs quarter / half-year / yearly leave credit for a leave-type rule; may call semi-monthly credit.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@in_LeaveRuleTransId` | in | `INT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_QHYLeaveCredit
  participant N0 as SP_GetPayableDaysAndLOP_Employerwise_DateWise
  participant N1 as SP_SemiMonthlyLeaveCredit
  participant N2 as UFN_WO_Employee_Weekly_Off_Details_LeaveCredit
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_GetPayableDaysAndLOP_Employerwise_DateWise` | procedure | Called while this object runs | [SP_GetPayableDaysAndLOP_Employerwise_DateWise](/docs/database/hrms/SP_GetPayableDaysAndLOP_Employerwise_DateWise) |
| `SP_SemiMonthlyLeaveCredit` | procedure | Called while this object runs | [SP_SemiMonthlyLeaveCredit](/docs/database/hrms/SP_SemiMonthlyLeaveCredit) |
| `UFN_WO_Employee_Weekly_Off_Details_LeaveCredit` | function | Called while this object runs | [UFN_WO_Employee_Weekly_Off_Details_LeaveCredit](/docs/database/hrms/UFN_WO_Employee_Weekly_Off_Details_LeaveCredit) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_QHYLeaveCredit.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `tDailyRegisterNew` | read or write |
| `TDesignationBasedLeave` | read or write |
| `TEmailNotification` | read or write |
| `TEmployee` | read or write |
| `TEmployeeGroupBasedLeave` | read or write |
| `TEmployeeInfo` | read or write |
| `TEmploymentTypeBasedLeave` | read or write |
| `TExperienceBasedLeaves` | read or write |
| `tLeaveBalance` | read or write |
| `TLeaveBalanceLedger` | read or write |
| `TLeaveBusinessUnit` | read or write |
| `TLeaveEmployeeStatus` | read or write |
| `TLeaveGrade` | read or write |
| `TLeaveLocation` | read or write |
| `TLeaveRequestDays` | read or write |
| `TLeaveTypeMaster` | read or write |
| `TLeaveTypeRules` | read or write |
| `TLeaveTypeRules_History` | read or write |
| `TModulePages` | read or write |
| `TResignationDetails` | read or write |
| `TTerminationDetail` | read or write |
| `TWorkflowManagement` | read or write |

## Flow

```mermaid
flowchart TD
  Start[SP_QHYLeaveCredit] --> Run[Apply the inputs]
  Run --> Child[SP_GetPayableDaysAndLOP_Employerwise_DateWise]
  Child --> Done[Return the result]
```
