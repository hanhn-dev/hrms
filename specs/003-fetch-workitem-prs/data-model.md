# Data Model: Work Item Pull Request Hash Collection

**Phase**: 1 - Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## Entities

### WorkItemPullRequestLookupRequest

Represents one MCP request to discover or finalize pull requests for one or more work items.

| Field | Type | Description |
|-------|------|-------------|
| `ids` | `string` | Comma-separated top-level work item IDs supplied by the caller |
| `authors` | `string[]` | Optional selected author filters |
| `targetBranches` | `string[]` | Optional selected target branch filters |
| `statuses` | `string[]` | Optional selected pull request status filters |
| `sortBy` | `'mergedDate' \| 'pullRequestId'` | Requested sort field |
| `sortDirection` | `'asc' \| 'desc'` | Requested sort direction |
| `confirmUnfiltered` | `boolean` | Explicit confirmation that the caller wants the final unfiltered list |

Validation rules:
- `ids` must contain at least one non-whitespace character.
- Up to 25 top-level work item IDs are supported per request.
- If no filters are supplied and `confirmUnfiltered` is `false` or absent, the response enters the refinement stage instead of returning final hashes.
- `sortBy` defaults to `pullRequestId` for deterministic ordering when no explicit sort is chosen.

---

### PullRequestArtifactReference

Represents one PR link discovered from a requested work item or an eligible child work item.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | `string` | Azure DevOps project identifier embedded in the artifact link |
| `repositoryId` | `string` | Repository identifier for the linked PR |
| `pullRequestId` | `number` | Pull request ID within the repository |
| `linkedWorkItemId` | `number` | Work item that directly contains the PR artifact link |
| `requestedAncestorId` | `number` | Top-level requested work item that caused discovery |
| `linkSource` | `'requested' \| 'child'` | Whether the link came from a requested work item or an eligible child |

Validation rules:
- `projectId`, `repositoryId`, and `pullRequestId` must all be present for the link to be usable.
- Duplicate references are permitted during discovery but must be deduplicated before PR hydration.

---

### PullRequestCandidate

Represents one unique hydrated pull request before final filtering.

| Field | Type | Description |
|-------|------|-------------|
| `repositoryId` | `string` | Repository identity for deduplication |
| `pullRequestId` | `number` | Pull request ID |
| `title` | `string` | Pull request title |
| `author` | `string \| null` | Display name of the PR creator |
| `status` | `string` | Normalized PR status |
| `targetBranch` | `string` | Target branch ref or branch name |
| `mergedDate` | `string \| null` | Merge completion timestamp when the PR is completed |
| `url` | `string` | Human-readable PR URL |
| `hashes` | `PullRequestHashes` | Collected commit hashes for the PR |
| `relatedWorkItemIds` | `number[]` | All requested or child work items that caused inclusion |
| `requestedWorkItemIds` | `number[]` | Top-level requested work items associated with this PR |
| `childWorkItemIds` | `number[]` | Eligible child work items associated with this PR |

Validation rules:
- Candidates are unique by the tuple `(repositoryId, pullRequestId)`.
- `relatedWorkItemIds` must contain at least one value.
- At least one hash field should be populated when Azure DevOps provides it.

---

### PullRequestHashes

Represents the commit hashes exposed in the final summary.

| Field | Type | Description |
|-------|------|-------------|
| `mergeCommit` | `string \| null` | Merge commit hash when the PR has been completed |
| `sourceCommit` | `string \| null` | Last known source-side commit hash |
| `targetCommit` | `string \| null` | Last known target-side commit hash |

Validation rules:
- `mergeCommit` may be `null` for active or abandoned PRs.
- The final summary should expose all non-null hash fields rather than discarding source or target hashes.

---

### PullRequestFilterFacets

Represents the refinement choices returned before finalization.

| Field | Type | Description |
|-------|------|-------------|
| `authors` | `string[]` | Distinct non-empty authors from the candidate PR set |
| `targetBranches` | `string[]` | Distinct target branches from the candidate PR set |
| `statuses` | `string[]` | Distinct PR statuses from the candidate PR set |
| `sortFields` | `('mergedDate' \| 'pullRequestId')[]` | Sort options available to the caller |
| `totalPullRequests` | `number` | Count of unique candidate PRs before filtering |

---

### PullRequestLookupIssue

Represents a requested work item that could not be evaluated successfully.

| Field | Type | Description |
|-------|------|-------------|
| `workItemId` | `number \| null` | Parsed work item ID when available |
| `input` | `string` | Original user-supplied token |
| `status` | `'invalid' \| 'not_found' \| 'inaccessible'` | Issue classification |
| `message` | `string` | User-facing explanation |

---

### PullRequestLookupResponse

Represents the full tool payload returned to the MCP caller.

| Field | Type | Description |
|-------|------|-------------|
| `stage` | `'needs_refinement' \| 'complete'` | Whether the tool is asking for user choices or returning final results |
| `requestedCount` | `number` | Number of parsed top-level work item entries |
| `candidateTotal` | `number` | Number of unique PR candidates before filtering |
| `matchingTotal` | `number` | Number of PRs remaining after filters are applied |
| `issues` | `PullRequestLookupIssue[]` | Work-item-specific issues |
| `facets` | `PullRequestFilterFacets \| null` | Available filter choices when `stage` is `needs_refinement` |
| `questions` | `RefinementQuestion[] \| null` | Structured prompts the agent can ask the user |
| `results` | `PullRequestCandidate[] \| null` | Final PR list when `stage` is `complete` |

---

### RefinementQuestion

Represents one follow-up question returned to guide the next user turn.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `'authors' \| 'targetBranches' \| 'statuses' \| 'sortBy'` | Input field the question maps to |
| `prompt` | `string` | User-facing question text |
| `options` | `string[]` | Available choices derived from the candidate set |
| `allowSkip` | `boolean` | Whether the user can skip this dimension |
| `multiSelect` | `boolean` | Whether multiple values are allowed |

## State Transitions

1. Parse top-level work item IDs and classify invalid entries.
2. Hydrate requested work items and immediate eligible child work items.
3. Discover and hydrate unique PR candidates.
4. If no refinement inputs are supplied and unfiltered finalization is not confirmed, return `stage = needs_refinement` with `candidateTotal`, `facets`, and `questions`.
5. Apply filters and sort choices in memory.
6. Return `stage = complete` with `matchingTotal`, `results`, and the final PR hash summary.

## Validation Rules Summary

| Rule | Description |
|------|-------------|
| Top-level batch limit | Support up to 25 requested work item IDs per call |
| Immediate children only | Eligible child traversal stops after one hierarchy level |
| PR deduplication | Unique PRs are keyed by repository and PR ID |
| Facet-first interaction | Missing refinement inputs produce a question-bearing staged response |
| Explicit unfiltered finalization | Users can skip filters by confirming they want the full list |
| Total visibility | The response always reports candidate totals, and final responses also report matching totals |