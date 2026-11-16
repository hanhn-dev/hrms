---
object: USP_CompOff_Rule_Delete
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CompOff_Rule_Delete.sql
last-analyzed: 2026-11-09
---

# USP_CompOff_Rule_Delete

## What it does

Deletes a compensatory-off rule.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CompOffRuleID` | in | `INT` |
| `@UserID` | in | `INT` |
| `@RequestComesFrom` | in | `VARCHAR(MAX)` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_CompOff_Rule_Delete
  participant N0 as USP_CompOffRule_History_Save
  Caller->>Main: execute
  Main->>N0: call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_CompOffRule_History_Save` | procedure | Called while this object runs | No page yet |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CompOff_Rule_Delete.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TCompOffRule` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_CompOff_Rule_Delete] --> Run[Apply the inputs]
  Run --> Child[USP_CompOffRule_History_Save]
  Child --> Done[Return the result]
```
