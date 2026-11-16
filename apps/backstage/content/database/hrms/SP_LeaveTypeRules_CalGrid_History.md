---
object: SP_LeaveTypeRules_CalGrid_History
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LeaveTypeRules_CalGrid_History.sql
last-analyzed: 2026-11-09
---

# SP_LeaveTypeRules_CalGrid_History

## What it does

Writes calculation-grid history for a leave-type rule transaction.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TransId` | in | `INT` |
| `@HistoryCreatedBy` | in | `INT` |

## Call sequence

Calls no other procedures or functions.

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_AdminLM_UpdLeaveTypeRules` | procedure | [SP_AdminLM_UpdLeaveTypeRules](/docs/database/hrms/SP_AdminLM_UpdLeaveTypeRules) |

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LeaveTypeRules_CalGrid_History.sql`:
1. Accept the declared parameters and run the procedure or function body.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TDesignationBasedLeave` | read or write |
| `TDesignationBasedLeave_History` | read or write |
| `TEmployeeGroupBasedLeave` | read or write |
| `TEmployeeGroupBasedLeave_History` | read or write |
| `TEmploymentTypeBasedLeave` | read or write |
| `TEmploymentTypeBasedLeave_History` | read or write |
| `TExperienceBasedLeaves` | read or write |
| `TExperienceBasedLeaves_History` | read or write |
| `TPresentDaysBasedLeave` | read or write |
| `TPresentDaysBasedLeave_History` | read or write |

## Flow

```mermaid
flowchart TD
  Start[SP_LeaveTypeRules_CalGrid_History] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
