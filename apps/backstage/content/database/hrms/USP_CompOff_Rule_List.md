---
object: USP_CompOff_Rule_List
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CompOff_Rule_List.sql
last-analyzed: 2026-11-09
---

# USP_CompOff_Rule_List

## What it does

Lists compensatory-off rules for an employer.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveTransactionID` | in | `INT` |
| `@EmployerID` | in | `INT` |
| `@CompOffRuleID` | in | `INT` |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CompOff_Rule_List.sql`:
1. Accept the declared parameters and run the procedure or function body.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TCompOffPreference` | read or write |
| `TCompOffRule` | read or write |
| `TCompOffRuleApplicableOn` | read or write |
| `TCompOffRuleMappingParameter` | read or write |
| `TCompOffRuleMappingParameterValue` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_CompOff_Rule_List] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
