---
object: SP_AdminPMS_EmployeeSearch
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_EmployeeSearch.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_EmployeeSearch

## What it does

Stored procedure `SP_AdminPMS_EmployeeSearch`. Reads `TPMSEmployerConfiguration`, `TPMSAppraisalCycles`, `TPMS_AppraisalReviewFrequency`, `TTitle`, `TMEmploymentTypes`, `TPMSEmployeeAppraisalCycleMapping`, `TLocation`, `TEmployeeRoleMaster`, and others. Calls `Sp_OpenEncryptionKeys`, `SP_CloseEncryptionKey`, `Fn_GetEmployeeName`, `FN_LocationBU_GetEmployeeDetails`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |
| `@EmployeeIds` | in | NVARCHAR(4000), default '' |
| `@EmployementTypeId` | in | NVARCHAR(2000), default NULL |
| `@DesignationId` | in | NVARCHAR(2000), default NULL |
| `@BusinessUnit` | in | NVARCHAR(2000), default NULL |
| `@LocationId` | in | NVARCHAR(2000), default NULL |
| `@RoleIds` | in | NVARCHAR(2000), default NULL |
| `@EmployeeId` | in | INT, default 0 |
| `@ExcludeActiveResigned` | in | bit, default 0 |
| `@AppraisalCycleId` | in | int, default 0 |
| `@ExcludeEligibilityRules` | in | bit, default 0 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminPMS_EmployeeSearch
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

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_EmployeeSearch.sql`.
2. EXEC Sp_OpenEncryptionKeys
3. INSERT INTO @TableBu (Unit)
4. INSERT INTO @TableRole (RoleIds)
5. INSERT INTO @TableEmpIds (EmpIds)
6. INSERT INTO @TableLocations (Locations)
7. INSERT INTO @TableEmploymentType (EmployementTypeId)
8. INSERT INTO @TableDesignationId (DesignationId)
9. When IF (
10. Else branch.
11. EXEC SP_CloseEncryptionKey

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TEmployeeInfo` | read |
| `TEmployeeRoleMaster` | read |
| `TLocation` | read |
| `TMEmploymentTypes` | read |
| `TORGChart` | read |
| `TPMSAppraisalCycles` | read |
| `TPMSEmployeeAppraisalCycleMapping` | read |
| `TPMSEmployerConfiguration` | read |
| `TPMS_AppraisalReviewFrequency` | read |
| `TRequestWorkflows` | read |
| `TSeparationType` | read |
| `TTitle` | read |
| `tResignationDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_EmployeeSearch] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[EXEC Sp_OpenEncryptionKeys]
  S1[INSERT INTO TableBu Unit]
  S2[INSERT INTO TableRole RoleIds]
  S3[INSERT INTO TableEmpIds EmpIds]
  S4[INSERT INTO TableLocations Locations]
  S5[INSERT INTO TableEmploymentType EmployementTypeId]
```
