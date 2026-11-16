---
object: Sp_AdminPMS_GetAppraisalCycleDet
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAppraisalCycleDet.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetAppraisalCycleDet

## What it does

Stored procedure `Sp_AdminPMS_GetAppraisalCycleDet`. Reads `TPMSRatingMaster`, `TPMSGOALCATEGORY`, `TPMSGOALCATEGORYDETAILS`, `TPMSWeightageMaster`, `TPMSCategoryDesignationMapping`, `TPMSEmployeeAppraisalCycleMapping`, `tpmsappraisalcycles`, `TPMS_AppraisalReviewFrequency`, and others. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleId` | in | Int, default 0 |
| `@Employerid` | in | Int |
| `@GoalSettingId` | in | int, default 0 |
| `@ReviewFrequencyId` | in | int, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAppraisalCycleDet.sql`.
2. When if(isnull(@ReviewFrequencyId,0)>0)
3. When if(@AppraisalCycleId>0)
4. Else branch.
5. When if(@AppraisalCycleId>0)
6. Else branch.

## Tables

| Table | Read or write |
|---|---|
| `TPMSCategoryDesignationMapping` | read |
| `TPMSCategoryMaster` | read |
| `TPMSEmployeeAppraisalCycleMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployeeGoalSettingTemplate` | read |
| `TPMSGOALCATEGORY` | read |
| `TPMSGOALCATEGORYDETAILS` | read |
| `TPMSRatingMaster` | read |
| `TPMSWeightageMaster` | read |
| `TPMS_AppraisalReviewFrequency` | read |
| `TPMS_AssesmentGoalReviewFrequencies` | read |
| `TPMS_GoalSettingReviewFrequency` | read |
| `temployee` | read |
| `tpmsappraisalcycles` | read |
| `tpmsemployeegoalmapping` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetAppraisalCycleDet] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> EndNode[Return]
  S0[When if isnull ReviewFrequencyId,0 >0]
  S1[When if AppraisalCycleId>0]
  S2[Else branch.]
  S3[When if AppraisalCycleId>0]
  S4[Else branch.]
```
