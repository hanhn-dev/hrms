---
object: Sp_MQB_GetQuestionList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_GetQuestionList.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_GetQuestionList

## What it does

Returns the question grid for a root employer, optional filters, and module.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pREId` | in | int |
| `@pQueCategoryId` | in | int (default NULL) |
| `@pQuestionaireTypeId` | in | int (default NULL) |
| `@pModuleId` | in | int (default null) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_MQB_GetQuestionList
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  participant C2 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>C0: nested call
  Main->>C1: nested call
  Main->>C2: nested call
```

## Callers

No other procedure or function in the Master Question Bank direct set calls this object.

Application code may call it through `masterQuestionBankDAL`.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | on the script path that reaches this call | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | on the script path that reaches this call | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Fn_GetEmployeeName` | function | on the script path that reaches this call | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. Calls `Sp_OpenEncryptionKeys` before reading encrypted name columns.
2. Calls `SP_CloseEncryptionKey` before returning.
3. Selects and returns one or more result sets for the caller.

## Tables

| Table | Read or write |
|---|---|
| `TQUESTION_LOOKUP` | read |
| `TLOOKUPT` | read |
| `TAssessment` | read |
| `TFeedback` | read |
| `TQuiz` | read |
| `TEmployeeTrainingEvaluationQuestion` | read |
| `TQuestion` | read |
| `TEvaluationTemplateQuestion` | read |
| `TQuestion_LOOKUP` | read |
| `Tcustomizelabel` | read |
| `TEmployeeTrainingEvaluation` | read |
| `TEvaluationTemplateSection` | read |
| `TTrainingEvaluationPhaseDetails` | read |
| `TTraining` | read |
| `TQuestion_Module` | read |
| `TEMPLOYEEINFO` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_GetQuestionList] --> OpenKeys[Open encryption keys]
  OpenKeys[Open encryption keys] --> Work[Read or write tables]
  Work[Read or write tables] --> CloseKeys[Close encryption keys]
  CloseKeys[Close encryption keys] --> EndNode[Return to caller]
```
