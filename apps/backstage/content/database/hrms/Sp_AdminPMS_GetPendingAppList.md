---
object: Sp_AdminPMS_GetPendingAppList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetPendingAppList.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetPendingAppList

## What it does

Stored procedure `Sp_AdminPMS_GetPendingAppList`. Reads `TEmployerDetails`, `TPMSAppraisalCycles`, `tEmployee`, `TRequestWorkflows`, `tpmsappraisalcycles`, `tpms_appraisalreviewfrequency`, `TPMSEmployeeAppraisalCycleMapping`, `TPMSEmployerConfiguration`, and others. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptionKey`, `Fn_GetEmployeeName`, `FN_GetEmployeeOrgName`, `FN_LocationBU_GetEmployeeDetails`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleid` | in | Int, default 0 |
| `@GoalSettingId` | in | int, default 0 |
| `@ReviewFrequencyId` | in | int, default 0 |
| `@Employerid` | in | Int, default 0 |
| `@Employeeid` | in | Int, default 0 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_AdminPMS_GetPendingAppList
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  participant C2 as Fn_GetEmployeeName
  participant C3 as FN_GetEmployeeOrgName
  participant C4 as FN_LocationBU_GetEmployeeDetails
  Caller->>Main: execute
  Main->>C0: direct call
  Main->>C1: direct call
  Main->>C2: direct call
  Main->>C3: direct call
  Main->>C4: direct call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | direct call | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | direct call | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Fn_GetEmployeeName` | function | direct call | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `FN_GetEmployeeOrgName` | function | direct call | [FN_GetEmployeeOrgName](/docs/database/hrms/FN_GetEmployeeOrgName) |
| `FN_LocationBU_GetEmployeeDetails` | function | direct call | [FN_LocationBU_GetEmployeeDetails](/docs/database/hrms/FN_LocationBU_GetEmployeeDetails) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetPendingAppList.sql`.
2. Exec Sp_OpenEncryptionKeys
3. When if(@AppraisalCycleid>0)
4. Else branch.
5. Exec SP_CloseEncryptionKey

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TEmployerDetails` | read |
| `TORGChart` | read |
| `TPMSAppraisalCycles` | read |
| `TPMSEMPLOYEEGOALMAPPING` | read |
| `TPMSEmployeeAppraisalCycleMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployerConfiguration` | read |
| `TPMS_GoalSettingReviewFrequency` | read |
| `TRequestWorkflows` | read |
| `Temployeeinfo` | read |
| `tEmployee` | read |
| `tpms_appraisalreviewfrequency` | read |
| `tpmsappraisalcycles` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetPendingAppList] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> EndNode[Return]
  S0[Exec Sp_OpenEncryptionKeys]
  S1[When if AppraisalCycleid>0]
  S2[Else branch.]
  S3[Exec SP_CloseEncryptionKey]
```
