---
object: SP_AdminPMS_DelRatingScale
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_DelRatingScale.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_DelRatingScale

## What it does

Stored procedure `SP_AdminPMS_DelRatingScale`. Writes `TPMSRatingMaster`. Reads `TPMSAppraisalCycles`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RatingId` | in | Int |
| `@Employerid` | in | Int |
| `@ModifiedBy` | in | Int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_DelRatingScale.sql`.
2. When If (Select count(1) from TPMSAppraisalCycles Where Employerid=@Employerid and RatingId=@RatingId)>0
3. Else branch.
4. Update TPMSRatingMaster

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalCycles` | read |
| `TPMSRatingMaster` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_DelRatingScale] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> EndNode[Return]
  S0[When If Select count 1 from TPMSAppraisalCycles Where Employerid= Empl]
  S1[Else branch.]
  S2[Update TPMSRatingMaster]
```
