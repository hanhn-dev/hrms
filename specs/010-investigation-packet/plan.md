# Implementation Plan: az-mcp investigation packet

**Branch**: `010-investigation-packet` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

## Summary

Upgrade az-mcp from a thin field projector to an investigation packet in four slices. Logic lives in `@hrms/azure-devops`. `apps/az-mcp` stays a thin MCP shell: Zod input, serialize JSON (or image content), map errors. Test-first. Do not add write tools or extra ADO domains.

## Technical Context

- TypeScript 6.x strict; Node 22.18+
- `@modelcontextprotocol/sdk@1.30.0` (tool results already support `type: "image"`)
- `azure-devops-node-api@15.1.2`: `getComments`, `getThreads` already on the typed APIs
- Vitest in both packages; reuse existing mock `WorkItem` fixtures (five files)

## Slice order (each is independently shippable)

| Slice | Goal | New public tools |
|-------|------|------------------|
| 1 | Work-item packet | `az_get_work_item_comments`, `az_get_work_item_image` |
| 2 | PR review shape | `az_list_pull_request_threads` |
| 3 | List + search | `az_search_work_items` |
| 4 | Routing copy | none — descriptions + `.describe()` on the whole catalog |

Ship slice 1 first. It unblocks `p-fix-defect` from Azure CLI.

## Slice 1 — Work-item packet

### Mapping (`mapWorkItem`)

Stop this:

```ts
description: htmlToMarkdown(Description) || htmlToMarkdown(ReproSteps)
```

Return both fields. Empty string when unset. Hierarchy `missing` gains `reproSteps`.

Add to `WorkItem`:

| Field | ADO source |
|-------|------------|
| `reproSteps` | `Microsoft.VSTS.TCM.ReproSteps` (Markdown) |
| `priority` | `Microsoft.VSTS.Common.Priority` (`number \| null`) |
| `severity` | `Microsoft.VSTS.Common.Severity` (`string \| null`) |
| `createdDate` / `changedDate` | ISO strings or `null` |
| `createdBy` | `System.CreatedBy.displayName` |
| `childIds` | `System.LinkTypes.Hierarchy-Forward` relation URLs |
| `relatedWorkItemIds` | `System.LinkTypes.Related` relation URLs |
| `hints` | derived, see below |

Add `resourceUri: azdo://workitem/{id}/images/{attachmentId}` on **image** attachments only (`null` otherwise). Existing hierarchy `ImageAttachmentContext.resourceUri` stays as-is.

`hints` is a short string array, for example:

- image attachments → `Call az_get_work_item_image with id=<id> and attachmentId=<id>`
- `childIds.length > 0` → `Call az_get_work_item_hierarchy_context with id=<id>`
- always → `Call az_get_work_item_comments with id=<id> if discussion may add context`
- `parentId` set → `Parent work item is <parentId>`

### `az_get_work_item_comments`

- Input: `id` (positive int), optional `top` (default 50, max 200).
- Call `witApi.getComments(project, id, top)`.
- Map to `{ workItemId, totalCount, hasMore, comments: [{ id, author, createdDate, text }] }`.
- Convert HTML `text`/`renderedText` through existing `htmlToMarkdown`. Prefer markdown `text` when `format` is Markdown.
- Deleted comments omitted.

### `az_get_work_item_image`

- Input: `id`, `attachmentId`.
- Reuse `getWorkItem` + `client.getAttachmentContent` (same checks as the resource handler: must belong to the item, must be an image).
- Tool result: one `text` JSON metadata block **and** one `{ type: "image", data: base64, mimeType }`.
- Reject / `isError` when size > 5_000_000 bytes (protect context). Keep the existing `azdo://` resource; this tool is what agents will actually call.
- Widen `ToolResult` in `apps/az-mcp` to allow image content. Extract a tiny shared `readWorkItemImage(client, id, attachmentId)` used by both the resource handler and the tool so we do not duplicate the membership/MIME checks.

### Tests that must change meaning

`work-items.test.ts` currently expects Repro Steps to land in `description` when Description is empty. Replace with: `description === ''` and `reproSteps === 'Steps to reproduce text'`. Add a case where **both** fields are set and neither overwrites the other.

All five `mockWorkItem` fixtures need the new required fields.

### Hierarchy

`WorkItemHierarchyContextEntry` gains `reproSteps: string | null` and `missing.reproSteps`. Do not embed comments or image bytes in the hierarchy payload.

## Slice 2 — PR review shape

### Unified diff default (breaking)

`PullRequestChangedFile` today ships `baseContent` + `currentContent` (up to 100 KB each) plus `lineDiffBlocks`. Agents need the change.

- Keep fetching both sides internally (needed to build the diff).
- Build `unifiedDiff: string | null` from `lineDiffBlocks` + sliced file lines. No new npm `diff` dependency.
- Default response: `unifiedDiff` set, `baseContent`/`currentContent` **null**.
- New optional `includeContents: boolean` (default `false`) restores both sides for callers that need them.
- Truncate `unifiedDiff` with the same 100_000-byte cap; set `truncation.diff`.
- Add/delete files: whole file as `+` / `-` hunks.

### `az_list_pull_request_threads`

- Input: `pullRequest` (id or URL, reuse `parsePullRequestReference` / existing resolve), optional `status` default `"active"`.
- Call `gitApi.getThreads(repositoryId, pullRequestId, projectId)`.
- Map to `{ pullRequestId, threads: [{ threadId, status, filePath, line, comments: [{ id, author, content, publishedDate }] }] }`.
- Skip deleted threads. `filePath`/`line` from `threadContext` (`rightFileStart.line` preferred, else left).
- Read-only. No reply/resolve in this feature.

Extract `resolvePullRequest` from `pull-request-detail.ts` if that is the smallest way to share ID/URL resolution with the threads function. Do not reshuffle the rest of that file.

## Slice 3 — List + search

### Widen `WorkItemSummary`

`assignedTo`, `tags`, `changedDate`, `iterationPath`, `parentId`, `hasChildren`.

`queryWorkItems` currently fetches only Title/Type/State. Expand the field list:

`System.Title`, `System.WorkItemType`, `System.State`, `System.AssignedTo`, `System.Tags`, `System.ChangedDate`, `System.IterationPath`, `System.Parent`.

`hasChildren`: true when `System.Parent` is not needed — children require relations. To avoid `$expand` on every list (ADO rejects `fields` + `$expand`), derive `hasChildren` as `false` unless we later add a relations pass. **Decision: omit `hasChildren` from v1** rather than double-fetch. Hierarchy hint stays on the full `WorkItem`. Summaries get `parentId` only.

### `az_search_work_items`

Structured WIQL builder. Inputs (all optional except that at least one filter **or** default project list is required):

| Input | WIQL |
|-------|------|
| `titleContains` | `[System.Title] CONTAINS '…'` |
| `assignedTo` | `[System.AssignedTo] = '…'` or `= @Me` when value is `@Me` |
| `type` | `[System.WorkItemType] = '…'` |
| `state` | `[System.State] = '…'` |
| `iteration` | `[System.IterationPath] UNDER '…'` |
| `changedSince` | `[System.ChangedDate] >= 'YYYY-MM-DD'` |
| `top` | default 50, max 200 |

Always constrain `[System.TeamProject]` to config/project. Reuse `escapeWiqlString`. Delegate to existing `queryWorkItems`. Keep `az_query_work_items` unchanged except description.

## Slice 4 — Routing copy

No behaviour change. Rewrite every `registerTool` description to include when-to-use and the next tool. Add `.describe()` on every Zod field. Update `apps/az-mcp/CLAUDE.md` and root `CLAUDE.md` catalogs.

Example for `az_get_work_item`:

> Retrieve one work item as an investigation packet (Markdown description, Repro Steps, acceptance criteria, priority, links, attachment resource URIs, hints). Use this when you have a single ID. Use `az_get_work_item_hierarchy_context` when the item may have child Tasks. Use `az_get_work_items` for a comma-separated list.

Do not add MCP `readOnlyHint` unless the current `registerTool` helper can pass annotations without fighting the SDK’s deep-instantiation workaround. Prefer descriptions over annotations if that helper would grow.

## File impact

| File | Slice |
|------|-------|
| `packages/integrations/azure-devops/src/types.ts` | 1–3 |
| `packages/integrations/azure-devops/src/work-items.ts` | 1, 3 |
| `packages/integrations/azure-devops/src/work-item-comments.ts` (new) | 1 |
| `packages/integrations/azure-devops/src/pull-request-detail.ts` | 2 |
| `packages/integrations/azure-devops/src/pull-request-threads.ts` (new) | 2 |
| `packages/integrations/azure-devops/src/index.ts` | 1–3 |
| matching `__tests__/*.test.ts` | 1–3 |
| `apps/az-mcp/src/server.ts` | 1–4 |
| `apps/az-mcp/src/tools/get-work-item-comments.ts` (new) | 1 |
| `apps/az-mcp/src/tools/get-work-item-image.ts` (new) | 1 |
| `apps/az-mcp/src/tools/list-pull-request-threads.ts` (new) | 2 |
| `apps/az-mcp/src/tools/search-work-items.ts` (new) | 3 |
| `apps/az-mcp/src/tools/get-pull-request.ts` | 2 |
| `apps/az-mcp/src/resources/work-item-image-resource.ts` | 1 (shared reader) |
| `apps/az-mcp/src/__tests__/server.test.ts` | 1–4 |
| five `mockWorkItem` fixtures | 1 |
| `CLAUDE.md`, `apps/az-mcp/CLAUDE.md` | 4 |
| `specs/001-azure-workitems-mcp/contracts/mcp-tools.md` | 4 (pointer to 010 contract) |

## Defaults

| Setting | Value |
|---------|-------|
| Comments `top` | 50 (max 200) |
| Image max bytes | 5_000_000 |
| PR `includeContents` | `false` |
| Unified diff cap | 100_000 bytes (same as today’s per-side cap) |
| Threads default status | `active` |
| Search `top` | 50 (max 200) |

## Constitution / complexity

No new packages. No write APIs. One intentional break: PR file contents omitted unless requested. Shared image reader is the only extraction; everything else is additive mapping + new files.

## Verification per slice

```bash
npm test --workspace=@hrms/azure-devops
npm test --workspace=az-mcp
```

Then TypeScript `--noEmit` on both workspaces. Workspace ESLint is currently broken repo-wide; do not block on it.

## What we will not do in this feature

Microsoft MCP already covers wiki/pipelines/test plans and PR write. Completing comments, Repro Steps, screenshots, diffs, and threads is the information-serving job. Follow-ups (explicitly not this plan): PR reply/resolve, `az_get_work_item_pull_requests` defaulting to investigation rather than cherry-pick, custom fields.
