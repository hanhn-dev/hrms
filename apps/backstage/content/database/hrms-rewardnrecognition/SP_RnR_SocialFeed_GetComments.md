---
object: SP_RnR_SocialFeed_GetComments
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_RnR_SocialFeed_GetComments.sql
last-analyzed: 2026-11-16
---

# SP_RnR_SocialFeed_GetComments

## What it does

Returns cursor-paged top-level comments for an active employer post (newest first) with author name, likeCount, userLiked, replyCount, and depth, plus a second result set with totalCount of top-level comments.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |
| `@PostId` | in | Post whose comments are listed |
| `@EmployeeId` | in | Optional caller for userLiked |
| `@PageSize` | in | Page size (default 20) |
| `@LastCommentId` | in | Cursor - return CommentId less than this |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_RnR_SocialFeed_GetComments
  Caller->>Main: execute
  Main-->>Caller: comments page and totalCount
```

## Callers

No other procedure executes this object. App caller: RnR `GET /api/v1/social-feed/:postId/comments` from [Social Feed](/docs/guides/reward-and-recognition/social-feed).

## Nested

Calls no other procedures or functions.

## Steps

1. Select top-level active comments joined to active employer post, with like/reply aggregates and TEmployee name.
2. Apply @LastCommentId cursor and FETCH NEXT @PageSize.
3. Return totalCount of top-level active comments for the post.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRnR_SocialPost` | read |
| `dbo.TRnR_SocialPostComment` | read |
| `dbo.TRnR_SocialPostCommentLike` | read |
| `dbo.TEmployee` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_RnR_SocialFeed_GetComments] --> Page[Page top-level comments]
  Page --> Total[Return totalCount]
  Total --> EndNode[End]
```
