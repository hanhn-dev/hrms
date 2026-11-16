---
object: Sp_MQB_InsertQOptionDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_MQB_InsertQOptionDetails.sql
last-analyzed: 2026-11-09
---

# Sp_MQB_InsertQOptionDetails

## What it does

Inserts or updates answer-option rows for a question and writes history.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pQuestionID` | in | INT |
| `@pQuesOptionID` | in | INT |
| `@pOptionText` | in | NVARCHAR(1000) |
| `@pOptionSelected` | in | BIT |
| `@pCreatedBy` | in | INT |
| `@pWeightage` | in | INT |
| `@IsRemark` | in | bit (default 0) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_MQB_InsertQOptionDetails
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

1. Opens a try block and begins a transaction when the script mutates data.
2. Inserts into the target table(s) listed under Tables.
3. Updates matching rows when the script path is an update or soft-delete.
4. Calls history helper(s) after the primary write.

## Tables

| Table | Read or write |
|---|---|
| `TQuestionOption` | read and write |
| `sys` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_MQB_InsertQOptionDetails] --> Work[Read or write tables]
  Work[Read or write tables] --> Hist[History helper]
  Hist[History helper] --> EndNode[Return to caller]
```
