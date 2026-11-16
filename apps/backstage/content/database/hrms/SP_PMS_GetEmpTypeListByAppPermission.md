---
object: SP_PMS_GetEmpTypeListByAppPermission
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_PMS_GetEmpTypeListByAppPermission.sql
last-analyzed: 2026-11-06
---

# SP_PMS_GetEmpTypeListByAppPermission

## What it does

Stored procedure `SP_PMS_GetEmpTypeListByAppPermission`. Reads `TPMSAppraisalCycles`, `TPMSEmployeeAppraisalCycleMapping`, `TPMSEmployeeSelfAppraisal`, `TPMS_AppraisalReviewFrequency`, `TEmployeeinfo`, `TMEmploymentTypes`, `TPMSEmployeeGoalSetting`, `TPMSEmployeeGoalMapping`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Int |
| `@AppraisalCycleId` | in | int, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_PMS_GetEmpTypeListByAppPermission.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TEmployeeinfo` | read |
| `TMEmploymentTypes` | read |
| `TPMSAppraisalCycles` | read |
| `TPMSEmployeeAppraisalCycleMapping` | read |
| `TPMSEmployeeGoalMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployeeSelfAppraisal` | read |
| `TPMS_AppraisalReviewFrequency` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_GetEmpTypeListByAppPermission] --> EndNode[Return]
```
