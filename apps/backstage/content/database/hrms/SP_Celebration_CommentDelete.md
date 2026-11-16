---
object: SP_Celebration_CommentDelete
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_CommentDelete.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_CommentDelete

## What it does

Deletes a comment (author or admin) and writes an audit row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |
| `@CommentId` | in | Input (`INT`) |
| `@IsAdmin` | in | Input (`BIT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_CommentDelete
  participant N0 as SP_Celebration_AuditInsert
  Caller->>Main: execute
  Main->>N0: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_Celebration_AuditInsert` | procedure | Called while this object runs | [SP_Celebration_AuditInsert](/docs/database/hrms/SP_Celebration_AuditInsert) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_CommentDelete.sql`:

1. Deletes a comment (author or admin) and writes an audit row.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.
4. Calls `SP_Celebration_AuditInsert` after a successful mutation.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationComment` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_CommentDelete] --> Run[Apply the inputs]
  Run --> Child[SP_Celebration_AuditInsert]
  Child --> Done[Return the result]
```
