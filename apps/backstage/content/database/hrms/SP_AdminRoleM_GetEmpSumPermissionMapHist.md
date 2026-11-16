---
object: SP_AdminRoleM_GetEmpSumPermissionMapHist
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminRoleM_GetEmpSumPermissionMapHist.sql
last-analyzed: 2026-11-06
---

# SP_AdminRoleM_GetEmpSumPermissionMapHist

## What it does

Returns the distinct Employee Summary change events for a role, with the modifier name and a date shifted to the employer time zone when the server zone differs.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RoleId` | in | Role |
| `@Employerid` | in | Employer and time-zone key |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminRoleM_GetEmpSumPermissionMapHist
  participant Sp_OpenEncryptionKeys as Sp_OpenEncryptionKeys
  participant FN_GetTimeZoneDiffOrgLevel as FN_GetTimeZoneDiffOrgLevel
  participant Fn_GetEmployeeName as Fn_GetEmployeeName
  participant FN_GetLocalTimeOrgLevel as FN_GetLocalTimeOrgLevel
  participant SP_CloseEncryptionKey as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Sp_OpenEncryptionKeys: before the select
  Main->>FN_GetTimeZoneDiffOrgLevel: zone check
  Main->>Fn_GetEmployeeName: modifier name. The literal Root Root is shown as Administrator
  Main->>FN_GetLocalTimeOrgLevel: local time when the zones differ
  Main->>SP_CloseEncryptionKey: after the select
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | before the select | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `FN_GetTimeZoneDiffOrgLevel` | function | zone check | [FN_GetTimeZoneDiffOrgLevel](/docs/database/hrms/FN_GetTimeZoneDiffOrgLevel) |
| `Fn_GetEmployeeName` | function | modifier name. The literal Root Root is shown as Administrator | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `FN_GetLocalTimeOrgLevel` | function | local time when the zones differ | [FN_GetLocalTimeOrgLevel](/docs/database/hrms/FN_GetLocalTimeOrgLevel) |
| `SP_CloseEncryptionKey` | procedure | after the select | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

1. Open encryption keys and compare time zones.
2. Read current TRollWisePageAccess rows and history rows for the role.
3. Resolve the modifier from TEmployee and return distinct role, transaction, modifier, and date.
4. Close encryption keys.

## Tables

| Table | Read or write |
|---|---|
| `TRollWisePageAccess` | read |
| `TRollWisePageAccessHistory` | read |
| `TRoles` | read |
| `TEmployee` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminRoleM_GetEmpSumPermissionMapHist] --> Work[Run the statements in Steps]
  Work --> Done[Return]
```
