---
object: SP_SemiMonthlyLeaveCredit
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_SemiMonthlyLeaveCredit.sql
last-analyzed: 2026-11-09
---

# SP_SemiMonthlyLeaveCredit

## What it does

Runs semi-monthly leave credit; nested from `SP_QHYLeaveCredit` for that frequency.

## Parameters

No parameters were parsed from the script signature.

## Call sequence

Calls no other procedures or functions.

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_QHYLeaveCredit` | procedure | [SP_QHYLeaveCredit](/docs/database/hrms/SP_QHYLeaveCredit) |

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_SemiMonthlyLeaveCredit.sql`:
1. Accept the declared parameters and run the procedure or function body.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

No `T*` tables were matched in a simple FROM/JOIN/INSERT/UPDATE/DELETE scan.

## Flow

```mermaid
flowchart TD
  Start[SP_SemiMonthlyLeaveCredit] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
