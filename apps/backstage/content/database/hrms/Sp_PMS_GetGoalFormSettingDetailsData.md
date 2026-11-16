---
object: Sp_PMS_GetGoalFormSettingDetailsData
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetGoalFormSettingDetailsData.sql
last-analyzed: 2026-11-06
---

# Sp_PMS_GetGoalFormSettingDetailsData

## What it does

Stored procedure `Sp_PMS_GetGoalFormSettingDetailsData`. Reads `TPMSEmployeeGoalFormSettingDetails`. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptiOnKey`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@FormID` | in | Int |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_PMS_GetGoalFormSettingDetailsData
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptiOnKey
  Caller->>Main: execute
  Main->>C0: direct call
  Main->>C1: direct call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | direct call | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptiOnKey` | procedure | direct call | [SP_CloseEncryptiOnKey](/docs/database/hrms/SP_CloseEncryptiOnKey) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetGoalFormSettingDetailsData.sql`.
2. Exec Sp_OpenEncryptionKeys
3. Exec SP_CloseEncryptiOnKey

## Tables

| Table | Read or write |
|---|---|
| `TPMSEmployeeGoalFormSettingDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_PMS_GetGoalFormSettingDetailsData] --> S0
  S0 --> S1
  S1 --> EndNode[Return]
  S0[Exec Sp_OpenEncryptionKeys]
  S1[Exec SP_CloseEncryptiOnKey]
```
