# MCP tools: investigation packet

Additive tools use the `az_` prefix. Existing tools keep their names; payloads widen as in [data-model.md](../data-model.md).

## Changed tools

### `az_get_work_item`

Retrieve one work item as an investigation packet (Markdown description, Repro Steps, acceptance criteria, priority, links, attachment resource URIs, hints). Use when you have a single ID. Use `az_get_work_item_hierarchy_context` when the item may have child Tasks. Use `az_get_work_items` for a comma-separated list.

Input: `{ id: number }` — positive work item ID.

Output: JSON `WorkItem` (widened). Errors: not found / auth, `isError: true`.

### `az_get_work_item_hierarchy_context`

Use when the item is a User Story/Feature/PBI that may have child Tasks. Do not use for a single Bug with no children — use `az_get_work_item`.

Output: existing shape plus `reproSteps` / `missing.reproSteps` per entry.

### `az_get_pull_request`

Retrieve PR metadata and a paginated list of changed files as truncated unified diffs. Use for code review. Use `az_list_pull_request_threads` for review comments. Pass `includeContents: true` only when you need both file sides.

Input: `{ pullRequest: number | string, top?: number, skip?: number, includeContents?: boolean }`.

### `az_list_work_items` / `az_query_work_items`

Summaries now include assignee, tags, changedDate, iterationPath, parentId. Prefer `az_search_work_items` unless you already have WIQL.

## New tools

### `az_get_work_item_comments`

Retrieve discussion comments for a work item, newest first. Use after `az_get_work_item` when the description is thin or QA notes may exist.

Input: `{ id: number, top?: number }` (`top` default 50, max 200).

Output: JSON `WorkItemCommentsResponse`.

### `az_get_work_item_image`

Retrieve one image attachment so the model can see a screenshot. Use when `attachments[].isImage` is true. Do not fetch non-image attachments.

Input: `{ id: number, attachmentId: string }`.

Output: `content[0]` text JSON `{ workItemId, attachmentId, name, mimeType, size }`; `content[1]` `{ type: "image", data, mimeType }`. `isError` if missing, not an image, or larger than 5 MB.

### `az_list_pull_request_threads`

Retrieve PR comment threads with file/line anchors. Default status is active. Read-only — this tool does not reply or resolve.

Input: `{ pullRequest: number | string, status?: string }`.

Output: JSON `PullRequestThreadsResponse`.

### `az_search_work_items`

Structured work-item search. Use this instead of writing WIQL. Use `az_query_work_items` only when you already have a WIQL string.

Input: optional `titleContains`, `assignedTo` (`@Me` allowed), `type`, `state`, `iteration`, `changedSince` (`YYYY-MM-DD`), `project`, `top`.

Output: JSON `WorkItemSummary[]`.
