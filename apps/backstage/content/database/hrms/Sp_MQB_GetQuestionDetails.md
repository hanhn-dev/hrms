---
object: Sp_MQB_GetQuestionDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_GetQuestionDetails.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_GetQuestionDetails

## What it does

Returns question header and option rows for one question id, including rating fields when present.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pQuestionId` | in | int |
| `@pModuleId` | in | INT (default NULL) |

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
| `TQuestion_LOOKUP` | read |
| `TQUESTION_LOOKUP` | read |
| `TLOOKUP` | read |
| `TQuestionOption` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_GetQuestionDetails] --> Work[Read or write tables]
  Work[Read or write tables] --> EndNode[Return to caller]
```
