---
object: Sp_MQB_GetQuestionTrainingsList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_GetQuestionTrainingsList.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_GetQuestionTrainingsList

## What it does

Returns trainings mapped to a question text.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pQuestionText` | in | NVARCHAR(max) |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function in the Master Question Bank direct set calls this object.

Application code may call it through `masterQuestionBankDAL`.

## Nested

Calls no other procedures or functions.

## Steps

1. Selects and returns one or more result sets for the caller.

## Tables

| Table | Read or write |
|---|---|
| `TQuestion` | read |
| `TAssessment` | read |
| `TFeedback` | read |
| `TQuiz` | read |
| `TEmployeeTrainingEvaluationQuestion` | read |
| `TEmployeeTrainingEvaluation` | read |
| `TTraining` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_GetQuestionTrainingsList] --> Work[Read or write tables]
  Work[Read or write tables] --> EndNode[Return to caller]
```
