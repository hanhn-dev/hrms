---
object: USP_MQB_GetEmployerModules
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_MQB_GetEmployerModules.sql
last-analyzed: 2026-11-09
---

# USP_MQB_GetEmployerModules

## What it does

Returns active LMS and Survey modules for the employer root.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | INT |

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
| `TEmployerDetails` | read |
| `TEmployerModule` | read |
| `THrmsModules` | read |

## Flow

```mermaid
flowchart TD
  Start[USP_MQB_GetEmployerModules] --> Work[Read or write tables]
  Work[Read or write tables] --> EndNode[Return to caller]
```
