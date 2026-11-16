---
object: SP_Celebration_ReactionList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_ReactionList.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_ReactionList

## What it does

Returns reaction counts and the actor's own reactions for a broadcast.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@BroadcastId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_ReactionList.sql`:

1. Returns reaction counts and the actor's own reactions for a broadcast.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationBroadcast` | read |
| `TCelebrationReaction` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_ReactionList] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
