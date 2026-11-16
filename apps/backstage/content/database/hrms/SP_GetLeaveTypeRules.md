---
object: SP_GetLeaveTypeRules
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetLeaveTypeRules.sql
last-analyzed: 2026-11-09
---

# SP_GetLeaveTypeRules

## What it does

Lists leave credit rules for an employer for the Leave Credit Rules grid.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | `INT` |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetLeaveTypeRules.sql`:
1. Accept the declared parameters and run the procedure or function body.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TLeaveTypeMaster` | read or write |
| `TLeaveTypeRules` | read or write |

## Flow

```mermaid
flowchart TD
  Start[SP_GetLeaveTypeRules] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
