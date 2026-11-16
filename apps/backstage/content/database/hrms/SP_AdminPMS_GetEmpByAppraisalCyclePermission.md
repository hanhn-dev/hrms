---
object: SP_AdminPMS_GetEmpByAppraisalCyclePermission
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetEmpByAppraisalCyclePermission.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_GetEmpByAppraisalCyclePermission

## What it does

Stored procedure `SP_AdminPMS_GetEmpByAppraisalCyclePermission`. Reads `TTitle`, `TOrgHierarchyDetails`, `TMEmploymentTypes`, `TPMSAppraisalCycles`, `TPMSEmployeeAppraisalCycleMapping`, `TPMSEmployeeSelfAppraisal`, `TPMS_AppraisalReviewFrequency`, `TEmployeeinfo`, and others. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptionKey`, `Fn_GetEmployeeName`, `FN_LocationBU_GetEmployeeDetails`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleId` | in | Int |
| `@Employerid` | in | Int |
| `@Employeeid` | in | Int |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminPMS_GetEmpByAppraisalCyclePermission
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  participant C2 as Fn_GetEmployeeName
  participant C3 as FN_LocationBU_GetEmployeeDetails
  Caller->>Main: execute
  Main->>C0: direct call
  Main->>C1: direct call
  Main->>C2: direct call
  Main->>C3: direct call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | direct call | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | direct call | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Fn_GetEmployeeName` | function | direct call | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `FN_LocationBU_GetEmployeeDetails` | function | direct call | [FN_LocationBU_GetEmployeeDetails](/docs/database/hrms/FN_LocationBU_GetEmployeeDetails) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetEmpByAppraisalCyclePermission.sql`.
2. EXEC Sp_OpenEncryptionKeys
3. EXEC SP_CloseEncryptionKey

## Tables

| Table | Read or write |
|---|---|
| `TEmployeeinfo` | read |
| `TMEmploymentTypes` | read |
| `TOrgHierarchyDetails` | read |
| `TPMSAppraisalCycles` | read |
| `TPMSEmployeeAppraisalCycleMapping` | read |
| `TPMSEmployeeGoalMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployeeSelfAppraisal` | read |
| `TPMS_AppraisalReviewFrequency` | read |
| `TTitle` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_GetEmpByAppraisalCyclePermission] --> S0
  S0 --> S1
  S1 --> EndNode[Return]
  S0[EXEC Sp_OpenEncryptionKeys]
  S1[EXEC SP_CloseEncryptionKey]
```
