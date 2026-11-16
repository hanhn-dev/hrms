---
object: Sp_MQB_GetTemplateInUse
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_GetTemplateInUse.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_GetTemplateInUse

## What it does

Reports whether a template is currently in use.

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
| `TEvaluationTemplateTraining` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_GetTemplateInUse] --> Work[Read or write tables]
  Work[Read or write tables] --> EndNode[Return to caller]
```
