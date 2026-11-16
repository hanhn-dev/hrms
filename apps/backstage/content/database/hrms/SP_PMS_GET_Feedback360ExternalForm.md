---
object: SP_PMS_GET_Feedback360ExternalForm
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_GET_Feedback360ExternalForm.sql
last-analyzed: 2026-11-09
---

# SP_PMS_GET_Feedback360ExternalForm

## What it does

The feedback form as an EXTERNAL reviewer sees it - the same five

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ReviewerId` | in | `INT` |
| `@EmployerId` | in | `INT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_PMS_GET_Feedback360ExternalForm
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as Sp_OpenEncryptionKeysNew
  Caller->>Main: execute
  Main->>C0: call
  Main->>C1: call
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

## Steps

1. Opens/closes encryption keys around encrypted employee fields.
2. Script path: `HRMS-DATABASE/HRMS/STOREPROCEDURE/360Feedback/V1/SP_PMS_GET_Feedback360ExternalForm.sql`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMS_Feedback360Answer` | read |
| `dbo.TPMS_Feedback360Campaign` | read |
| `dbo.TPMS_Feedback360Participant` | read |
| `dbo.TPMS_Feedback360Question` | read |
| `dbo.TPMS_Feedback360QuestionOption` | read |
| `dbo.TPMS_Feedback360QuestionRole` | read |
| `dbo.TPMS_Feedback360RatingScalePoint` | read |
| `dbo.TPMS_Feedback360Reviewer` | read |
| `dbo.TPMS_Feedback360ReviewerQuestion` | read |
| `dbo.TPMS_Feedback360Submission` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_GET_Feedback360ExternalForm] --> Body[Run procedure body]
  Body --> Done[Return result sets or status]
```
