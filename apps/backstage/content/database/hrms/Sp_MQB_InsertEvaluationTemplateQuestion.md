---
object: Sp_MQB_InsertEvaluationTemplateQuestion
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_InsertEvaluationTemplateQuestion.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_InsertEvaluationTemplateQuestion

## What it does

Maps a question into a template section and writes history.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEvaluationTemplateSectionId` | in | INT |
| `@pQuestionId` | in | INT |
| `@pDisplayOrder` | in | INT |
| `@pIsMandatory` | in | BIT (default 1) |
| `@pIsRemarksEnabled` | in | BIT (default 0) |
| `@pRemarksLabel` | in | NVARCHAR(100) (default 'Remarks') |
| `@pIsRemarksMandatory` | in | BIT (default 0) |
| `@pCreatedBy` | in | INT |
| `@pEvaluationTemplateQuestionId` | in | INT (default 0 OUTPUT) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_MQB_InsertEvaluationTemplateQuestion
  participant C0 as USP_SaveHistory
  Caller->>Main: execute
  Main->>C0: nested call
```

## Callers

No other procedure or function in the Master Question Bank direct set calls this object.

Application code may call it through `masterQuestionBankDAL`.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_SaveHistory` | procedure | on the script path that reaches this call | No page yet |

## Steps

1. Inserts into the target table(s) listed under Tables.
2. Calls history helper(s) after the primary write.

## Tables

| Table | Read or write |
|---|---|
| `TEvaluationTemplateQuestion` | write |
| `sys` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_InsertEvaluationTemplateQuestion] --> Work[Read or write tables]
  Work[Read or write tables] --> Hist[History helper]
  Hist[History helper] --> EndNode[Return to caller]
```
