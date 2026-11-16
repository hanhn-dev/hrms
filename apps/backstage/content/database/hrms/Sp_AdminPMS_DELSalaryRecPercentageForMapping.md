---
object: Sp_AdminPMS_DELSalaryRecPercentageForMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_DELSalaryRecPercentageForMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_DELSalaryRecPercentageForMapping

## What it does

Stored procedure `Sp_AdminPMS_DELSalaryRecPercentageForMapping`. Writes `TPMSSalaryRecPercentageForDesignation`, `TPMSSalaryRecPercentageForRole`, `TPMSSalaryRecPercentageForBU`, `TPMSSalaryRecPercentageForMapping`, `TPMSSalaryRecPercentageForRatingScaleDetails`. Reads `TPMSSalaryRevForEmployeeAssessment`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleId` | in | int |
| `@RatingId` | in | Int |
| `@EmployerId` | in | int |
| `@RecPercentageForMappingid` | in | int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_DELSalaryRecPercentageForMapping.sql`.
2. When if(Select Count(1) from TPMSSalaryRevForEmployeeAssessment where AssessmentId=@AppraisalCycleId)=0
3. UPDATE TPMSSalaryRecPercentageForDesignation Set IsDeleted =1 Where RecPercentageForMappingId = @RecPercentageForMappingid and RatingId=@RatingId and AppraisalCycleId=@AppraisalCyc
4. UPDATE TPMSSalaryRecPercentageForRole Set IsDeleted =1 Where RecPercentageForMappingId = @RecPercentageForMappingid and RatingId=@RatingId and AppraisalCycleId=@AppraisalCycleId;
5. UPDATE TPMSSalaryRecPercentageForBU Set IsDeleted =1 Where RecPercentageForMappingId = @RecPercentageForMappingid and RatingId=@RatingId and AppraisalCycleId=@AppraisalCycleId;
6. UPDATE TPMSSalaryRecPercentageForMapping Set IsDeleted =1 Where RecPercentageForMappingId = @RecPercentageForMappingid and RatingId=@RatingId and EmployerId=@EmployerId and Apprais
7. UPDATE TPMSSalaryRecPercentageForRatingScaleDetails Set IsDeleted =1 Where RecPercentageForMappingId = @RecPercentageForMappingid and RatingId=@RatingId and AppraisalCycleId=@Appra
8. Else branch.

## Tables

| Table | Read or write |
|---|---|
| `TPMSSalaryRecPercentageForBU` | write |
| `TPMSSalaryRecPercentageForDesignation` | write |
| `TPMSSalaryRecPercentageForMapping` | write |
| `TPMSSalaryRecPercentageForRatingScaleDetails` | write |
| `TPMSSalaryRecPercentageForRole` | write |
| `TPMSSalaryRevForEmployeeAssessment` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_DELSalaryRecPercentageForMapping] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[When if Select Count 1 from TPMSSalaryRevForEmployeeAssessment where A]
  S1[UPDATE TPMSSalaryRecPercentageForDesignation Set IsDeleted =1 Where Re]
  S2[UPDATE TPMSSalaryRecPercentageForRole Set IsDeleted =1 Where RecPercen]
  S3[UPDATE TPMSSalaryRecPercentageForBU Set IsDeleted =1 Where RecPercenta]
  S4[UPDATE TPMSSalaryRecPercentageForMapping Set IsDeleted =1 Where RecPer]
  S5[UPDATE TPMSSalaryRecPercentageForRatingScaleDetails Set IsDeleted =1 W]
```
