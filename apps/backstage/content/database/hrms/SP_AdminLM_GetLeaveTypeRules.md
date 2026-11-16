---
object: SP_AdminLM_GetLeaveTypeRules
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminLM_GetLeaveTypeRules.sql
last-analyzed: 2026-11-09
---

# SP_AdminLM_GetLeaveTypeRules

## What it does

Lists leave credit rules for one leave code and employer.

## Parameters

No parameters were parsed from the script signature.

## Call sequence

Calls no other procedures or functions.

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_AdminLM_InsLeaveTypeRules` | procedure | [SP_AdminLM_InsLeaveTypeRules](/docs/database/hrms/SP_AdminLM_InsLeaveTypeRules) |
| `SP_AdminLM_UpdLeaveTypeRules` | procedure | [SP_AdminLM_UpdLeaveTypeRules](/docs/database/hrms/SP_AdminLM_UpdLeaveTypeRules) |

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminLM_GetLeaveTypeRules.sql`:
1. Accept the declared parameters and run the procedure or function body.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TDesignationBasedLeave` | read or write |
| `TEmployeeGroupBasedLeave` | read or write |
| `TEmploymentTypeBasedLeave` | read or write |
| `TExperienceBasedLeaves` | read or write |
| `tLeaveTypeMaster` | read or write |
| `tLeaveTypeRules` | read or write |
| `TLeaveTypeRules` | read or write |
| `TPresentDaysBasedLeave` | read or write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminLM_GetLeaveTypeRules] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
