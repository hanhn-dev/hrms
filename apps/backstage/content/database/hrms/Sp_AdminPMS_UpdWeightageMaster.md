---
object: Sp_AdminPMS_UpdWeightageMaster
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_UpdWeightageMaster.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_UpdWeightageMaster

## What it does

Stored procedure `Sp_AdminPMS_UpdWeightageMaster`. Writes `TpmsWeightagescaledetails`, `TpmsWeightagemaster`. Reads `TPMSWeightageMaster`, `TPMSAppraisalCycles`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@WeightageId` | in | Int |
| `@WeightageName` | in | Varchar(50) |
| `@Levels` | in | Int |
| `@ModifiedBy` | in | Int |
| `@IsActive` | in | Int |
| `@EmployerId` | in | Int |
| `@WeightageScaleDetails` | in | Varchar(Max) |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_UpdWeightageMaster.sql`.
2. When If ( SELECT
3. Else branch.
4. INSERT INTO @Lv_WeightageScaleDetails
5. When if(len(@Lv_RatingColorCode)>0 AND (select count(*) from @lv_RatingColorCodes where RatingColorCode=@Lv_RatingColorCode)>0)
6. INSERT INTO @lv_DupRatingColorCodes (RatingColorCode)
7. INSERT INTO @lv_RatingColorCodes (RatingColorCode)
8. When if(select count(*) from @lv_DupRatingColorCodes)>0
9. Else branch.
10. UPDATE TpmsWeightagemaster
11. DELETE FROM TpmsWeightagescaledetails
12. INSERT INTO TpmsWeightagescaledetails (Levels, WeightageId, MinWeightage, MaxWeightage, LevelDescription, Remark, OutcomeValue,RatingColorCode)

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalCycles` | read |
| `TPMSWeightageMaster` | read |
| `TpmsWeightagemaster` | write |
| `TpmsWeightagescaledetails` | read and write |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_UpdWeightageMaster] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[When If SELECT]
  S1[Else branch.]
  S2[INSERT INTO Lv_WeightageScaleDetails]
  S3[When if len Lv_RatingColorCode >0 AND select count * from lv_RatingCol]
  S4[INSERT INTO lv_DupRatingColorCodes RatingColorCode]
  S5[INSERT INTO lv_RatingColorCodes RatingColorCode]
```
