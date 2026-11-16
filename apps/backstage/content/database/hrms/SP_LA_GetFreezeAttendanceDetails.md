---
object: SP_LA_GetFreezeAttendanceDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LA_GetFreezeAttendanceDetails.sql
last-analyzed: 2026-11-06
---

# SP_LA_GetFreezeAttendanceDetails

## What it does

Lists attendance-freeze rows for one employer. It opens the encryption keys so the creator's employment number and name can be read, selects from `TFreezeAttendance`, then closes the keys.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Organisation whose freeze rows are listed |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_LA_GetFreezeAttendanceDetails
  participant Open as Sp_OpenEncryptionKeys
  participant Close as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Open: open keys
  Main->>Close: close keys
```

## Callers

No other procedure or function calls this object. `AttendanceRegularizationDAL.GetFreezeAttendanceDetails` calls it. Attendance Management reaches that DAL through `AttendanceRegularizationBLL.GetFreezeAttendanceDetails`.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | at the start of the read | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | after the select | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

1. `EXEC Sp_OpenEncryptionKeys`.
2. Select freeze date, creator employment number, creator name, created date, comments, and applicable-to from `TFreezeAttendance` for `@Employerid`.
3. `EXEC SP_CloseEncryptionKey`.

## Tables

| Table | Read or write |
|---|---|
| `TFreezeAttendance` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_LA_GetFreezeAttendanceDetails] --> Open[Open encryption keys]
  Open --> Read[Read TFreezeAttendance]
  Read --> Close[Close encryption key]
```
