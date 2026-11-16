---
object: SP_Celebration_ReactionToggle
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_ReactionToggle.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_ReactionToggle

## What it does

Adds or removes the actor's reaction type on a broadcast, then returns updated counts.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |
| `@BroadcastId` | in | Input (`INT`) |
| `@ReactionType` | in | Input (`VARCHAR(20)`) |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_ReactionToggle.sql`:

1. Adds or removes the actor's reaction type on a broadcast, then returns updated counts.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationBroadcast` | read |
| `TCelebrationReaction` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_ReactionToggle] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
