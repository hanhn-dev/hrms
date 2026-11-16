---
object: SP_Celebration_BroadcastCreators
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_BroadcastCreators.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_BroadcastCreators

## What it does

Distinct broadcast creators (plus the signed-in actor) for the list filter.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_BroadcastCreators
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

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_BroadcastCreators.sql`:

1. Distinct broadcast creators (plus the signed-in actor) for the list filter.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationSettings` | read |
| `TEmployeeInfo` | read |
| `TCelebrationBroadcast` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_BroadcastCreators] --> Run[Apply the inputs]
  Run --> Child[Fn_GetEmployeeName]
  Child --> Done[Return the result]
```
