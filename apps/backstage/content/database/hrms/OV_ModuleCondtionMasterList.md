---
object: OV_ModuleCondtionMasterList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_ModuleCondtionMasterList.sql
last-analyzed: 2026-11-09
---

# OV_ModuleCondtionMasterList

## What it does

Lists active condition master names from OccuranceVialoationConditionMaster. Procedure name uses the misspelling Condtion.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `(none)` | - | Procedure takes no parameters |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object. `ViolationsOccurrenceDAL` in Core API executes it for Setup Violations & Occurrence (Setup Condition row condition dropdown).

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_ModuleCondtionMasterList.sql`, select distinct ConditionID and ConditionName where Active = 1.

## Tables

| Table | Read or write |
|---|---|
| `dbo.OccuranceVialoationConditionMaster` | read |

## Flow

```mermaid
flowchart TD
  Start["OV_ModuleCondtionMasterList"]
  Sel["Select active conditions"]
  Start --> Sel
```
