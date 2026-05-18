# Data Model: Multiple Work Item Retrieval

**Phase**: 1 - Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## Entities

### MultiWorkItemRequest

Represents a user request to retrieve several work items from a comma-separated input string.

| Field | Type | Description |
|-------|------|-------------|
| `rawIds` | `string` | Original comma-separated input provided by the caller |
| `entries` | `WorkItemRequestEntry[]` | Ordered parsed entries derived from the input |
| `validUniqueIds` | `number[]` | Deduplicated numeric IDs that will be sent to Azure DevOps |

Validation rules:
- `rawIds` must contain at least one non-whitespace character.
- The request must contain at least one usable numeric ID.
- The count of parsed IDs must not exceed the supported batch limit of 25.

---

### WorkItemRequestEntry

Represents one parsed token from the comma-separated input while preserving the user's original ordering.

| Field | Type | Description |
|-------|------|-------------|
| `index` | `number` | Original zero-based position in the request |
| `rawValue` | `string` | Raw token before normalization |
| `normalizedValue` | `string` | Trimmed token used for validation |
| `parsedId` | `number \| null` | Parsed numeric ID if valid; otherwise `null` |

Validation rules:
- `normalizedValue` must be a positive integer string to produce `parsedId`.
- Empty tokens produced by repeated commas or trailing commas are invalid entries.

---

### WorkItemBatchResult

Represents the full response for a multi-item retrieval request.

| Field | Type | Description |
|-------|------|-------------|
| `requestedCount` | `number` | Number of parsed request entries |
| `successCount` | `number` | Number of entries resolved to work items |
| `issueCount` | `number` | Number of entries resolved to issues |
| `results` | `WorkItemBatchResultEntry[]` | Ordered per-entry outcomes matching request order |

Notes:
- `results` preserves the user-supplied order.
- Duplicate IDs may appear more than once in `results` even when fetched only once from Azure DevOps.

---

### WorkItemBatchResultEntry

Represents the result for one requested entry.

| Field | Type | Description |
|-------|------|-------------|
| `index` | `number` | Original request position |
| `input` | `string` | Trimmed input token |
| `id` | `number \| null` | Parsed numeric ID when available |
| `status` | `'found' \| 'invalid' \| 'not_found' \| 'inaccessible'` | Outcome for that entry |
| `workItem` | `WorkItem \| null` | Full work item payload when status is `found` |
| `message` | `string \| null` | User-facing issue explanation when status is not `found` |

Validation rules:
- Exactly one of `workItem` or `message` must be populated.
- `status === 'found'` requires `workItem`.
- Non-found statuses require `message`.

---

### WorkItem

Existing Azure DevOps work item detail object reused from the current integration package.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Azure DevOps work item ID |
| `title` | `string` | Work item title |
| `type` | `string` | Work item type |
| `state` | `string` | Current workflow state |
| `description` | `string` | Markdown-converted description |
| `acceptanceCriteria` | `string` | Markdown-converted acceptance criteria |
| `attachments` | `WorkItemAttachment[]` | Attached file metadata |
| `tags` | `string[]` | Split tag values |
| `assignedTo` | `string \| null` | Display name of assignee |
| `iterationPath` | `string` | Iteration path |
| `areaPath` | `string` | Area path |
| `parentId` | `number \| null` | Parent work item ID |
| `url` | `string` | Human-readable Azure DevOps URL |

---

## State Transitions

No server-side state transitions are introduced. Requests are parsed, validated, resolved, and returned within a single stateless call.

## Validation Rules Summary

| Rule | Description |
|------|-------------|
| Positive integers only | Only positive integer tokens are eligible for Azure DevOps retrieval |
| Trim whitespace | Surrounding whitespace is ignored during parsing |
| Preserve order | Final `results` must match request order exactly |
| Maintain compatibility | Existing single-item retrieval response shape remains unchanged |
| Batch limit | Requests above 25 IDs are rejected before Azure DevOps calls |
| Per-entry classification | Invalid, missing, and inaccessible entries are reported independently |