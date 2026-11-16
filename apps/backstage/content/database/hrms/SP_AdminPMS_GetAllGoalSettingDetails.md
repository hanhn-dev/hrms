---
object: SP_AdminPMS_GetAllGoalSettingDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetAllGoalSettingDetails.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_GetAllGoalSettingDetails

## What it does

Stored procedure `SP_AdminPMS_GetAllGoalSettingDetails`. Reads `TPMSEmployeeGoalSettingDetails`, `TPMSEmployeeGoalSettingReviewLevel`, `TPMSEmployeeGoalSetting`, `TPMSEmployeeGoalMapping`, `TPMSCategoryMaster`, `TPMSEmployeeGoalSettingTemplate`, `tpmsemployeegoalmapping`, `TPMS_GoalSettingReviewFrequency`, and others. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Int |
| `@GoalSettingId` | in | int, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetAllGoalSettingDetails.sql`.
2. When If(@GoalSettingId=0)
3. Else branch.

## Tables

| Table | Read or write |
|---|---|
| `TPMSCategoryMaster` | read |
| `TPMSEmployeeGoalMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployeeGoalSettingDetails` | read |
| `TPMSEmployeeGoalSettingReviewLevel` | read |
| `TPMSEmployeeGoalSettingTemplate` | read |
| `TPMSGoalSettingIncludeNewJoinees` | read |
| `TPMS_GoalSettingReviewFrequency` | read |
| `tpmsemployeegoalmapping` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_GetAllGoalSettingDetails] --> S0
  S0 --> S1
  S1 --> EndNode[Return]
  S0[When If GoalSettingId=0]
  S1[Else branch.]
```
