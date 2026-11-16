---
object: USP_LM_LBA_Adjustment_Save
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LM_LBA_Adjustment_Save.sql
last-analyzed: 2026-11-09
---

# USP_LM_LBA_Adjustment_Save

## What it does

Saves React Leave Balance Adjustment rows and executes `SP_AdminLM_LeaveAdjustment` per adjustment.

## Parameters

No parameters were parsed from the script signature.

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LM_LBA_Adjustment_Save.sql`:
1. Accept the declared parameters and run the procedure or function body.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

No `T*` tables were matched in a simple FROM/JOIN/INSERT/UPDATE/DELETE scan.

## Flow

```mermaid
flowchart TD
  Start[USP_LM_LBA_Adjustment_Save] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
