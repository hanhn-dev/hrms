---
object: Sp_AdminRoleM_GetRolePageMapHistByTransid
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminRoleM_GetRolePageMapHistByTransid.sql
last-analyzed: 2026-11-06
---

# Sp_AdminRoleM_GetRolePageMapHistByTransid

## What it does

Returns the distinct history events for a role's page mapping: role name, transaction id, who modified it, and the modified date. The date uses the employer time zone when the server zone differs.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RoleId` | in | Role |
| `@Employerid` | in | Employer, also used for the time-zone check |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_AdminRoleM_GetRolePageMapHistByTransid
  participant Sp_OpenEncryptionKeys as Sp_OpenEncryptionKeys
  participant FN_GetTimeZoneDiffOrgLevel as FN_GetTimeZoneDiffOrgLevel
  participant Fn_GetEmployeeName as Fn_GetEmployeeName
  participant FN_GetLocalTimeOrgLevel as FN_GetLocalTimeOrgLevel
  participant SP_CloseEncryptionKey as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Sp_OpenEncryptionKeys: before the select
  Main->>FN_GetTimeZoneDiffOrgLevel: decides whether to shift the timestamp
  Main->>Fn_GetEmployeeName: modified-by name
  Main->>FN_GetLocalTimeOrgLevel: local time when the zones differ
  Main->>SP_CloseEncryptionKey: after the select
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | before the select | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `FN_GetTimeZoneDiffOrgLevel` | function | decides whether to shift the timestamp | [FN_GetTimeZoneDiffOrgLevel](/docs/database/hrms/FN_GetTimeZoneDiffOrgLevel) |
| `Fn_GetEmployeeName` | function | modified-by name | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `FN_GetLocalTimeOrgLevel` | function | local time when the zones differ | [FN_GetLocalTimeOrgLevel](/docs/database/hrms/FN_GetLocalTimeOrgLevel) |
| `SP_CloseEncryptionKey` | procedure | after the select | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

1. Open encryption keys and read whether the employer time zone differs from the server.
2. Return distinct role, transaction, modifier, and date rows from the current mapping and its history.
3. When the zones differ, convert the UTC modify time with FN_GetLocalTimeOrgLevel.
4. Close encryption keys.

## Tables

| Table | Read or write |
|---|---|
| `TRoles` | read |
| `TRolePagesMapping` | read |
| `TRolePagesMappingHistory` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminRoleM_GetRolePageMapHistByTransid] --> Work[Run the statements in Steps]
  Work --> Done[Return]
```
