---
object: SP_AdminRoleM_GetEmpSumPermissionByRoleID
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminRoleM_GetEmpSumPermissionByRoleID.sql
last-analyzed: 2026-11-06
---

# SP_AdminRoleM_GetEmpSumPermissionByRoleID

## What it does

Returns Employee Summary tab rows for a role: menu, tab, active and inactive flags, employee names, and the stored employee id list.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RoleId` | in | Role |
| `@EmployerID` | in | Employer on the tab grant |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminRoleM_GetEmpSumPermissionByRoleID
  participant Sp_OpenEncryptionKeys as Sp_OpenEncryptionKeys
  participant Fn_GetEmployeeNameByEmployee as Fn_GetEmployeeNameByEmployeeID
  participant SP_CloseEncryptionKey as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Sp_OpenEncryptionKeys: before the select
  Main->>Fn_GetEmployeeNameByEmployee: turns EmployeeIds into names
  Main->>SP_CloseEncryptionKey: after the select
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | before the select | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `Fn_GetEmployeeNameByEmployeeID` | function | turns EmployeeIds into names | [Fn_GetEmployeeNameByEmployeeID](/docs/database/hrms/Fn_GetEmployeeNameByEmployeeID) |
| `SP_CloseEncryptionKey` | procedure | after the select | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

1. Open encryption keys.
2. Join Tmenudetails, Ttabdetails, and troletabdetails where the tab name is Employee Summary and the role and employer match.
3. Look up flags, names, and employee ids from TRollWisePageAccess for the same menu, tab, role, and employer.
4. Close encryption keys.

## Tables

| Table | Read or write |
|---|---|
| `Tmenudetails` | read |
| `Ttabdetails` | read |
| `troletabdetails` | read |
| `TRollWisePageAccess` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminRoleM_GetEmpSumPermissionByRoleID] --> Work[Run the statements in Steps]
  Work --> Done[Return]
```
