---
object: SP_Celebration_CommentList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_CommentList.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_CommentList

## What it does

Lists comments on a broadcast for the hub view popup.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@BroadcastId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_CommentList
  participant N0 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>N0: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | Called while this object runs | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_CommentList.sql`:

1. Lists comments on a broadcast for the hub view popup.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationBroadcast` | read |
| `TCelebrationComment` | read |
| `TEmployeeInfo` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_CommentList] --> Run[Apply the inputs]
  Run --> Child[Fn_GetEmployeeName]
  Child --> Done[Return the result]
```
