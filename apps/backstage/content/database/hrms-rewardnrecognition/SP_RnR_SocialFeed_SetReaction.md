---
object: SP_RnR_SocialFeed_SetReaction
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_RnR_SocialFeed_SetReaction.sql
last-analyzed: 2026-11-16
---

# SP_RnR_SocialFeed_SetReaction

## What it does

Sets the caller reaction on an active employer post. Inserts when none exists, deletes when the same type is sent again (toggle off), or updates when switching types. Runs under SERIALIZABLE transaction. Returns fresh reactionCount and userReactionType. Raises on missing/inactive post or invalid reaction type.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |
| `@PostId` | in | Target post |
| `@EmployeeId` | in | Reactor employee id |
| `@ReactionType` | in | like | love | celebrate | support | insightful | funny |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_RnR_SocialFeed_SetReaction
  Caller->>Main: execute
  Main-->>Caller: reactionCount userReactionType
```

## Callers

No other procedure executes this object. App caller: RnR `POST /api/v1/social-feed/:postId/react` from [Social Feed](/docs/guides/reward-and-recognition/social-feed).

## Nested

Calls no other procedures or functions.

## Steps

1. Guard active post for employer; validate reaction type enum.
2. Read existing ReactionType for PostId/EmployeeId.
3. SERIALIZABLE transaction: insert, delete (same type), or update (different type).
4. Select reactionCount and caller userReactionType.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRnR_SocialPost` | read |
| `dbo.TRnR_SocialPostLike` | read/write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_RnR_SocialFeed_SetReaction] --> Guard[Validate post and type]
  Guard --> Exist{existing reaction}
  Exist -->|none| Ins[Insert]
  Exist -->|same| Del[Delete toggle off]
  Exist -->|other| Upd[Update type]
  Ins --> Ret[Return counts]
  Del --> Ret
  Upd --> Ret
```
