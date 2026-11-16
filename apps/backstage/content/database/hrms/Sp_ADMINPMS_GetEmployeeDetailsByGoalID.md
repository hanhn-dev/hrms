---
object: Sp_ADMINPMS_GetEmployeeDetailsByGoalID
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_ADMINPMS_GetEmployeeDetailsByGoalID.sql
last-analyzed: 2026-11-06
---

# Sp_ADMINPMS_GetEmployeeDetailsByGoalID

## What it does

Stored procedure `Sp_ADMINPMS_GetEmployeeDetailsByGoalID`. Reads `TTitle`, `TPMSEmployerConfiguration`, `TOrgHierarchyDetails`, `TMEmploymentTypes`, `TEmployee`, `TEmployeeInfo`, `TPMSEmployeeGoalMapping`, `TPMSEmployeeGoalSetting`, and others. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptiOnKey`, `Fn_GetEmployeeName`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@GoalSettingId` | in | Int |
| `@EmployerId` | in | Int |
| `@Employeeid` | in | INT, default 0 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_ADMINPMS_GetEmployeeDetailsByGoalID
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptiOnKey
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
| `SP_CloseEncryptiOnKey` | procedure | direct call | [SP_CloseEncryptiOnKey](/docs/database/hrms/SP_CloseEncryptiOnKey) |
| `Fn_GetEmployeeName` | function | direct call | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_ADMINPMS_GetEmployeeDetailsByGoalID.sql`.
2. EXEC Sp_OpenEncryptionKeys
3. EXEC SP_CloseEncryptiOnKey

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TEmployeeInfo` | read |
| `TMEmploymentTypes` | read |
| `TOrgHierarchyDetails` | read |
| `TPMSEmployeeGoalFormSettingDetails` | read |
| `TPMSEmployeeGoalMapping` | read |
| `TPMSEmployeeGoalSetting` | read |
| `TPMSEmployerConfiguration` | read |
| `TTitle` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_ADMINPMS_GetEmployeeDetailsByGoalID] --> S0
  S0 --> S1
  S1 --> EndNode[Return]
  S0[EXEC Sp_OpenEncryptionKeys]
  S1[EXEC SP_CloseEncryptiOnKey]
```
