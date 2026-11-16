---
object: Sp_MQB_InsertEvaluationTemplate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_InsertEvaluationTemplate.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_InsertEvaluationTemplate

## What it does

Inserts an evaluation template header and writes history.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pTemplateName` | in | NVARCHAR(200) |
| `@pCategoryCD` | in | INT (default 161) |
| `@pRootEmployerID` | in | INT |
| `@pCreatedBy` | in | INT |
| `@pEvaluationTemplateId` | in | INT (default 0 OUTPUT) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_MQB_InsertEvaluationTemplate
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
| `TEvaluationTemplate` | read and write |
| `sys` | read |
| `TCustomerSettings` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_InsertEvaluationTemplate] --> Work[Read or write tables]
  Work[Read or write tables] --> Hist[History helper]
  Hist[History helper] --> EndNode[Return to caller]
```
