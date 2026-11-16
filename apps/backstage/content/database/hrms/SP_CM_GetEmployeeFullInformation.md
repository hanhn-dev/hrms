---
object: SP_CM_GetEmployeeFullInformation
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_CM_GetEmployeeFullInformation.sql
last-analyzed: 2026-11-09
---

# SP_CM_GetEmployeeFullInformation

## What it does

Returns one wide employee profile row for `@EmployeeID`: decrypted personal fields, employment/org attributes, contact, bank/shift/geo flags, and related lookup names. Used by BGV to fill post-employment person details after an employee is selected. The inventoried script begins with `USE [HRM-CL-Prod]` / `DROP PROCEDURE` before `CREATE`; runtime behaviour is the `CREATE` body.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeID` | in | Employee to load |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_CM_GetEmployeeFullInformation
  participant Open as Sp_OpenEncryptionKeys
  participant OpenN as Sp_OpenEncryptionKeysNew
  participant Dec as Fn_DecryptData
  participant Shift as UFN_GET_EmployeeShift
  participant Close as SP_CloseEncryptionKey
  participant CloseN as Sp_CloseEncryptionKeyNew
  Caller->>Main: execute
  Main->>Open: open keys
  Main->>OpenN: open new keys
  Main->>Shift: resolve shift
  Main->>Dec: decrypt PII columns
  Main->>Close: close keys
  Main->>CloseN: close new keys
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_CM_GetEmployeeInformation` | procedure | No page yet |

Application caller: BGV API `employeeDAL.GetEmployeeFullInformation`.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | always | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `Sp_OpenEncryptionKeysNew` | procedure | always | [Sp_OpenEncryptionKeysNew](/docs/database/hrms/Sp_OpenEncryptionKeysNew) |
| `Fn_DecryptData` | function | name, DOB, tax id, middle name, and other encrypted columns | [Fn_DecryptData](/docs/database/hrms/Fn_DecryptData) |
| `UFN_GET_EmployeeShift` | function | shift resolution | [UFN_GET_EmployeeShift](/docs/database/hrms/UFN_GET_EmployeeShift) |
| `SP_CloseEncryptionKey` | procedure | always | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Sp_CloseEncryptionKeyNew` | procedure | always | [SP_CloseEncryptionKeyNew](/docs/database/hrms/SP_CloseEncryptionKeyNew) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_CM_GetEmployeeFullInformation.sql`.
2. `READ UNCOMMITTED`; open both encryption key helpers.
3. Resolve active contract end date, cross-reporting flag, latest contact detail, shift, geo-fencing flag.
4. Select decrypted and joined employment profile columns from `TEmployee`, `TEmployeeInfo`, and related masters.
5. Close both encryption key helpers.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TEmployeeEmploymentType` | read |
| `dbo.TEmployerDetails` | read |
| `dbo.TEmployeeContactDetails` | read |
| `dbo.TSHIFTMASTER` | read |
| `dbo.TEMPLocationDetails` | read |
| Additional lookup/employment tables joined in the SELECT | read |

## Flow

```mermaid
flowchart TD
  Start[SP_CM_GetEmployeeFullInformation] --> Open[Open encryption keys]
  Open --> Prep[Resolve contract contact shift geo]
  Prep --> Select[Select decrypted full profile]
  Select --> Close[Close encryption keys]
```
