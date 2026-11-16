---
object: SP_Celebration_BroadcastLimitedEdit
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_BroadcastLimitedEdit.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_BroadcastLimitedEdit

## What it does

Updates allow-comments (and related limited fields) on a published broadcast, audits, and reloads the row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |
| `@BroadcastId` | in | Input (`INT`) |
| `@RowVer` | in | Input (`BIGINT`) |
| `@AllowComments` | in | Input (`BIT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_BroadcastLimitedEdit
  participant N0 as SP_Celebration_AuditInsert
  participant N1 as SP_Celebration_BroadcastGet
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_Celebration_AuditInsert` | procedure | Called while this object runs | [SP_Celebration_AuditInsert](/docs/database/hrms/SP_Celebration_AuditInsert) |
| `SP_Celebration_BroadcastGet` | procedure | Called while this object runs | [SP_Celebration_BroadcastGet](/docs/database/hrms/SP_Celebration_BroadcastGet) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_BroadcastLimitedEdit.sql`:

1. Updates allow-comments (and related limited fields) on a published broadcast, audits, and reloads the row.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.
4. Calls `SP_Celebration_AuditInsert` after a successful mutation.
5. Reloads the broadcast via `SP_Celebration_BroadcastGet` before returning.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationBroadcast` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_BroadcastLimitedEdit] --> Run[Apply the inputs]
  Run --> Child[SP_Celebration_AuditInsert, SP_Celebration_BroadcastGet]
  Child --> Done[Return the result]
```
