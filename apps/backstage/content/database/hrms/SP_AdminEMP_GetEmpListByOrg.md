---
object: SP_AdminEMP_GetEmpListByOrg
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminEMP_GetEmpListByOrg.sql
last-analyzed: 2026-11-06
---

# SP_AdminEMP_GetEmpListByOrg

## What it does

Lists employees in an organisation for a picker. It opens the encryption keys, decrypts names, and closes the keys.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@active` | in | Active. Default 'Y' |
| `@departmentID` | in | Department ID. Default 0 |
| `@organizationId` | in | Organization Id. Default 0 |
| `@EmployeeId` | in | Employee Id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminEMP_GetEmpListByOrg
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  participant C2 as Fn_GetEmployeeName
  participant C3 as Fn_DecryptData
  participant C4 as FN_LocationBU_GetEmployeeDetails
  Caller->>Main: execute
  Main->>C0: Sp_OpenEncryptionKeys
  Main->>C1: SP_CloseEncryptionKey
  Main->>C2: Fn_GetEmployeeName
  Main->>C3: Fn_DecryptData
  Main->>C4: FN_LocationBU_GetEmployeeDetails
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | during execution | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | during execution | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Fn_GetEmployeeName` | function | during execution | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `Fn_DecryptData` | function | during execution | [Fn_DecryptData](/docs/database/hrms/Fn_DecryptData) |
| `FN_LocationBU_GetEmployeeDetails` | function | during execution | [FN_LocationBU_GetEmployeeDetails](/docs/database/hrms/FN_LocationBU_GetEmployeeDetails) |

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminEMP_GetEmpListByOrg.sql`.

1. EXEC Sp_OpenEncryptionKeys
2. SELECT @IsCrossReportingApplicable=IsCrossReportingApplicable FROM TemployerDetails
3. IF @IsCrossReportingApplicable='N'
4. IF(@departmentID = 0)
5. SELECT @Lv_Root_EmployerId= RootEmployerId FROM TemployerDetails WHERE employerid=@organizationId
6. IF(@departmentID = 0)
7. EXEC SP_CloseEncryptionKey

## Tables

| Table | Read or write |
|---|---|
| `TemployerDetails` | read |
| `TOrgHierarchyDetails` | read |
| `ttitle` | read |
| `TEmployee` | read |
| `TEmployeeInfo` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminEMP_GetEmpListByOrg] --> Body[Run the script body]
  Body --> Nested[Call Sp_OpenEncryptionKeys, SP_CloseEncryptionKey, Fn_GetEmployeeName, Fn_DecryptData, FN_LocationBU_GetEmployeeDetails]
```
