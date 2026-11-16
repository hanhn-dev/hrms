---
object: Sp_MQB_GetEvaluationTemplateDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_GetEvaluationTemplateDetails.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_GetEvaluationTemplateDetails

## What it does

Returns template header, sections, questions, and options.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEvaluationTemplateId` | in | INT |

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
| `TEvaluationTemplate` | read |
| `TEvaluationTemplateSection` | read |
| `TQUESTION_LOOKUP` | read |
| `TEvaluationTemplateQuestion` | read |
| `TQuestionOption` | read |
| `TQuestion` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_GetEvaluationTemplateDetails] --> Work[Read or write tables]
  Work[Read or write tables] --> EndNode[Return to caller]
```
