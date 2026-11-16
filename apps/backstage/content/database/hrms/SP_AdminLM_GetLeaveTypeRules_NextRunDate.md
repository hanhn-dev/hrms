---
object: SP_AdminLM_GetLeaveTypeRules_NextRunDate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminLM_GetLeaveTypeRules_NextRunDate.sql
last-analyzed: 2026-11-09
---

# SP_AdminLM_GetLeaveTypeRules_NextRunDate

## What it does

Calculates the next credit-rule run date from effective date, period, and frequency.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | `INT` |
| `@LeaveCode` | in | `CHAR(4)` |
| `@EffectiveFrom` | in | `DATE` |
| `@PeriodOfCredit` | in | `CHAR(2)` |
| `@Frequency` | in | `VARCHAR(20)` |
| `@NextRunDate` | out | `DATETIME` |

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

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminLM_GetLeaveTypeRules_NextRunDate.sql`:
1. Accept the declared parameters and run the procedure or function body.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `tEmployerDetails` | read or write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminLM_GetLeaveTypeRules_NextRunDate] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
