---
object: SP_TS_GetAproverListByOrg
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_TS_GetAproverListByOrg.sql
last-analyzed: 2026-11-16
---

# SP_TS_GetAproverListByOrg

## What it does

Returns the organisation approver list for TimePort project configuration and mapping screens. Opens and closes encryption keys around encrypted name fields.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@employerId` | in | Employer id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TS_GetAproverListByOrg
  participant N_Sp_OpenEncryptionKeys as Sp_OpenEncryptionKeys
  participant N_SP_CloseEncryptionKey as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>N_Sp_OpenEncryptionKeys: execute
  Main->>N_SP_CloseEncryptionKey: execute
```

## Callers

Application only. timeportDAL.GetAproverListByOrg.

## Nested

| Object | Kind | Page |
|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_TS_GetAproverListByOrg.sql`:

1. EXEC Sp_OpenEncryptionKeys.
2. Select approver employees for the organisation.
3. EXEC SP_CloseEncryptionKey.

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TEmployeeInfo` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[SP_TS_GetAproverListByOrg] --> S0
  S0["EXEC Sp_OpenEncryptionKeys."]
  S1["Select approver employees for the organisation."]
  S2["EXEC SP_CloseEncryptionKey."]
  S0 --> S1
  S1 --> S2
  S2 --> Done[Return]
```
