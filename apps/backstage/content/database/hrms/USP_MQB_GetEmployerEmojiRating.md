---
object: USP_MQB_GetEmployerEmojiRating
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_MQB_GetEmployerEmojiRating.sql
last-analyzed: 2026-11-09
---

# USP_MQB_GetEmployerEmojiRating

## What it does

Returns employer emoji rating defaults.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |

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
| `TEmployerEmojiRating` | read |

## Flow

```mermaid
flowchart TD
  Start[USP_MQB_GetEmployerEmojiRating] --> Work[Read or write tables]
  Work[Read or write tables] --> EndNode[Return to caller]
```
