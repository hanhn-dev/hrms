---
object: SP_AdminPMS_DelAppraisalCycle
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_DelAppraisalCycle.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_DelAppraisalCycle

## What it does

Stored procedure `SP_AdminPMS_DelAppraisalCycle`. Writes `TPMSAppraisalCycles`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ApprisalCycleId` | in | Int |
| `@Employerid` | in | Int |
| `@ModifiedBy` | in | Int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_DelAppraisalCycle.sql`.
2. When If (Select Count(1) From TPMSAppraisalCycles Where Employerid=@Employerid And AppraisalCycleId=@ApprisalCycleId And IsInitiated=1)>0
3. Else branch.
4. Update TPMSAppraisalCycles

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalCycles` | read and write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_DelAppraisalCycle] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> EndNode[Return]
  S0[When If Select Count 1 From TPMSAppraisalCycles Where Employerid= Empl]
  S1[Else branch.]
  S2[Update TPMSAppraisalCycles]
```
