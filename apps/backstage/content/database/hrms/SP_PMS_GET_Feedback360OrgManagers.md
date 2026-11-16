---
object: SP_PMS_GET_Feedback360OrgManagers
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_GET_Feedback360OrgManagers.sql
last-analyzed: 2026-11-09
---

# SP_PMS_GET_Feedback360OrgManagers

## What it does

The Functional / Reporting / Review manager each participant of a

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CampaignId` | in | `INT` |
| `@EmployerId` | in | `INT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_PMS_GET_Feedback360OrgManagers
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as Sp_OpenEncryptionKeysNew
  participant C2 as SP_CloseEncryptionKey
  participant C3 as Sp_CloseEncryptionKeyNew
  Caller->>Main: execute
  Main->>C0: call
  Main->>C1: call
  Main->>C2: call
  Main->>C3: call
```

## Callers

Application caller: Core API `Feedback360DAL` / `Feedback360Service` for the Performance Assessment → 360° Feedback React module (`Feedback360.aspx`).

| Object | Kind | Page |
|---|---|---|
| _(application)_ | Core API | [360° Feedback guide](/docs/guides/performance-assessment/360-feedback) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | start/end of batch | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `Sp_OpenEncryptionKeysNew` | procedure | start/end of batch | [Sp_OpenEncryptionKeysNew](/docs/database/hrms/Sp_OpenEncryptionKeysNew) |
| `SP_CloseEncryptionKey` | procedure | start/end of batch | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Sp_CloseEncryptionKeyNew` | procedure | start/end of batch | [Sp_CloseEncryptionKeyNew](/docs/database/hrms/Sp_CloseEncryptionKeyNew) |

## Steps

1. Opens/closes encryption keys around encrypted employee fields.
2. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_GET_Feedback360OrgManagers.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TORGChart` | read |
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360Participant` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_GET_Feedback360OrgManagers] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
