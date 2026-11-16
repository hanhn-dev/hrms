---
object: SP_AdminPMS_SrchEmpByGoalPeriod
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_SrchEmpByGoalPeriod.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_SrchEmpByGoalPeriod

## What it does

Stored procedure `SP_AdminPMS_SrchEmpByGoalPeriod`. Reads `trequestworkflows`, `TRequestWorkflows`, `temployeeinfo`, `TPMSEmployeeGoalSetting`, `TPMSEmployeeGoalMapping`, `TPMS_GoalSettingReviewFrequency`, `tEmployeeinfo`, `TEmployee`, and others. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptionKey`, `Fn_GetEmployeeName`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@GoalSettingId` | in | Int |
| `@EmployeeName` | in | Varchar(200) |
| `@ReviewFrequncyId` | in | int, default 0 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminPMS_SrchEmpByGoalPeriod
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  participant C2 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>C0: direct call
  Main->>C1: direct call
  Main->>C2: direct call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | direct call | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | direct call | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Fn_GetEmployeeName` | function | direct call | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_SrchEmpByGoalPeriod.sql`.
2. Exec Sp_OpenEncryptionKeys;
3. Else branch.
4. Exec SP_CloseEncryptionKey

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TPMSEmployeeGoalMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployerConfiguration` | read |
| `TPMS_GoalSettingReviewFrequency` | read |
| `TRequestWorkflows` | read |
| `Temployeeinfo` | read |
| `tEmployeeinfo` | read |
| `temployeeinfo` | read |
| `trequestworkflows` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_SrchEmpByGoalPeriod] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> EndNode[Return]
  S0[Exec Sp_OpenEncryptionKeys;]
  S1[Else branch.]
  S2[Exec SP_CloseEncryptionKey]
```
