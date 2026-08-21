# Data model: investigation packet

Additive fields unless noted. All new DTO fields are `readonly`.

## WorkItem (widened)

Existing fields unchanged, except `description` is **only** `System.Description` (no Repro Steps fallback).

| Field | Type | Notes |
|-------|------|--------|
| `reproSteps` | `string` | Markdown; `""` if unset |
| `priority` | `number \| null` | |
| `severity` | `string \| null` | |
| `createdDate` | `string \| null` | ISO |
| `changedDate` | `string \| null` | ISO |
| `createdBy` | `string \| null` | display name |
| `childIds` | `readonly number[]` | Hierarchy-Forward |
| `relatedWorkItemIds` | `readonly number[]` | Related |
| `hints` | `readonly string[]` | derived |

## WorkItemAttachment (widened)

| Field | Type | Notes |
|-------|------|--------|
| `resourceUri` | `string \| null` | `azdo://workitem/{workItemId}/images/{id}` when `isImage`; else `null` |

## WorkItemHierarchyContextEntry (widened)

| Field | Type |
|-------|------|
| `reproSteps` | `string \| null` |
| `missing.reproSteps` | `boolean` |

## WorkItemCommentsResponse (new)

```ts
interface WorkItemComment {
  readonly id: number;
  readonly author: string | null;
  readonly createdDate: string | null;
  readonly text: string;
}

interface WorkItemCommentsResponse {
  readonly workItemId: number;
  readonly totalCount: number;
  readonly hasMore: boolean;
  readonly comments: readonly WorkItemComment[];
}
```

## WorkItemSummary (widened)

| Field | Type |
|-------|------|
| `assignedTo` | `string \| null` |
| `tags` | `readonly string[]` |
| `changedDate` | `string \| null` |
| `iterationPath` | `string` |
| `parentId` | `number \| null` |

No `hasChildren` in this feature (would require relation expand, which ADO rejects alongside `fields`).

## PullRequestChangedFile (changed)

| Field | Change |
|-------|--------|
| `unifiedDiff` | **new** `string \| null` |
| `baseContent` / `currentContent` | **null by default**; populated only when `includeContents: true` |
| `truncation` | add optional `diff: boolean` alongside `base` / `current` |

`PullRequestDetailRequest` gains `includeContents?: boolean`.

## PullRequestThreadsResponse (new)

```ts
interface PullRequestThreadComment {
  readonly id: number;
  readonly author: string | null;
  readonly content: string;
  readonly publishedDate: string | null;
}

interface PullRequestThread {
  readonly threadId: number;
  readonly status: string;
  readonly filePath: string | null;
  readonly line: number | null;
  readonly comments: readonly PullRequestThreadComment[];
}

interface PullRequestThreadsResponse {
  readonly pullRequestId: number;
  readonly threads: readonly PullRequestThread[];
}
```

## SearchWorkItemsFilter (new)

`titleContains`, `assignedTo`, `type`, `state`, `iteration`, `changedSince` (all optional strings), `top?: number`, `project?: string`. At least one of the string filters may be omitted; the query still scopes to the project and orders by `System.ChangedDate DESC` (same as `listWorkItems`).
