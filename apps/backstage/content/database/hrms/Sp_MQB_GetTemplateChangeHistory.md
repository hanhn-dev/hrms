---
object: Sp_MQB_GetTemplateChangeHistory
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_GetTemplateChangeHistory.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_GetTemplateChangeHistory

## What it does

Returns change-history rows for a template.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEvaluationTemplateId` | in | INT |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_MQB_GetTemplateChangeHistory
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
| `TEvaluationTemplate_History` | read |
| `TEMPLOYEEINFO` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_GetTemplateChangeHistory] --> OpenKeys[Open encryption keys]
  OpenKeys[Open encryption keys] --> Work[Read or write tables]
  Work[Read or write tables] --> CloseKeys[Close encryption keys]
  CloseKeys[Close encryption keys] --> EndNode[Return to caller]
```
