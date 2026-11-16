---
object: Sp_AdminPMS_GetGoalSettingReviewLevel
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetGoalSettingReviewLevel.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetGoalSettingReviewLevel

## What it does

Stored procedure `Sp_AdminPMS_GetGoalSettingReviewLevel`. Reads `TWorkflowManagement`, `TWorkFlowBusinessUnits`, `TWorkFlowLocations`, `TPMSEmployerConfiguration`, `TEmployeeGoalSettingReviewLevelMaster`. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptionKey`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Int |
| `@FormType` | in | varchar(1), default 'G' |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_AdminPMS_GetGoalSettingReviewLevel
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>C0: direct call
  Main->>C1: direct call
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_ADMINPMS_GetEmployeeGoalDetails` | procedure | No page yet |
| `SP_PMS_GetCompetencyforSelfAppraisal` | procedure | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | direct call | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | direct call | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetGoalSettingReviewLevel.sql`.
2. EXEC Sp_OpenEncryptionKeys
3. When IF (@FormType = 'A')
4. INSERT INTO @TableName (
5. Else branch.
6. When if(select count(1) from TPMSEmployerConfiguration where EmployerId =@EmployerId and IsGoalFormWithWorkFlow=0)=1
7. INSERT INTO @RoleTableName(TempReviewLeveId,EmployeeRoleName)
8. Else branch.
9. INSERT INTO @TableName (
10. EXEC SP_CloseEncryptionKey

## Tables

| Table | Read or write |
|---|---|
| `TEmployeeGoalSettingReviewLevelMaster` | read |
| `TPMSEmployerConfiguration` | read |
| `TWorkFlowBusinessUnits` | read |
| `TWorkFlowLocations` | read |
| `TWorkflowManagement` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetGoalSettingReviewLevel] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[EXEC Sp_OpenEncryptionKeys]
  S1[When IF FormType = A]
  S2[INSERT INTO TableName]
  S3[Else branch.]
  S4[When if select count 1 from TPMSEmployerConfiguration where EmployerId]
  S5[INSERT INTO RoleTableName TempReviewLeveId,EmployeeRoleName]
```
