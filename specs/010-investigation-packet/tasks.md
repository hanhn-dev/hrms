# Tasks: az-mcp investigation packet

**Input**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/mcp-tools.md](./contracts/mcp-tools.md)

Format: `[ID] [P?] [Slice] Description` — `[P]` = parallel (different files). Write failing tests before implementation in each slice. Do not start Slice N+1 until Slice N verification passes.

Verify each slice with:

```bash
npm test --workspace=@hrms/azure-devops
npm test --workspace=az-mcp
```

---

## Slice 1 — Work-item packet (MVP)

**Goal**: One Bug ID yields Repro Steps, comments, and a screenshot the model can see, plus hints for the next call.

- [ ] T001 [P] [S1] Widen `WorkItem`, `WorkItemAttachment`, `WorkItemContextMissingFields`, `WorkItemHierarchyContextEntry` and add `WorkItemComment` / `WorkItemCommentsResponse` in `packages/integrations/azure-devops/src/types.ts`
- [ ] T002 [P] [S1] Export the new types from `packages/integrations/azure-devops/src/index.ts`

### Tests first

- [ ] T003 [S1] Replace the Repro-Steps-fallback test with “both fields independent”; add tests for priority/severity/dates/createdBy/childIds/relatedIds/`resourceUri`/`hints` in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [ ] T004 [S1] Add failing comments tests (maps markdown, omits deleted, `hasMore` from continuation token) in `packages/integrations/azure-devops/src/__tests__/work-item-comments.test.ts`
- [ ] T005 [P] [S1] Add failing handler tests for `az_get_work_item_comments` and `az_get_work_item_image` (valid image content block, non-image error, oversized error, missing attachment) under `apps/az-mcp/src/__tests__/tools/`
- [ ] T006 [S1] Extend `apps/az-mcp/src/__tests__/server.test.ts` catalog to expect the two new tool names and their input schemas
- [ ] T007 [P] [S1] Update the five `mockWorkItem` fixtures with the new required fields

### Implementation

- [ ] T008 [S1] Change `mapWorkItem` / `mapAttachments` / `mapWorkItemHierarchyContextEntry` / `buildWorkItemHints` in `packages/integrations/azure-devops/src/work-items.ts` so Description and Repro Steps never collapse
- [ ] T009 [S1] Implement `getWorkItemComments` in `packages/integrations/azure-devops/src/work-item-comments.ts` via `witApi.getComments`; export it
- [ ] T010 [S1] Extract `readWorkItemImage` shared by `apps/az-mcp/src/resources/work-item-image-resource.ts` and the new image tool (membership + isImage + 5 MB cap)
- [ ] T011 [S1] Add handlers `apps/az-mcp/src/tools/get-work-item-comments.ts` and `get-work-item-image.ts`; widen `ToolResult` to allow image content
- [ ] T012 [S1] Register both tools in `apps/az-mcp/src/server.ts`

**Checkpoint**: Repro Steps are a first-class field; comments and image tools are in the catalog; existing get/list/hierarchy tests pass.

---

## Slice 2 — PR review shape

**Goal**: `az_get_pull_request` returns a unified diff by default; active threads are readable.

- [ ] T013 [S2] Add `unifiedDiff`, `includeContents`, `truncation.diff`, and thread response types in `packages/integrations/azure-devops/src/types.ts`

### Tests first

- [ ] T014 [S2] Add failing tests: default file has `unifiedDiff` and null contents; `includeContents: true` restores both sides; add/delete hunks in `packages/integrations/azure-devops/src/__tests__/pull-request-detail.test.ts`
- [ ] T015 [S2] Add failing thread tests (active filter, file/line from `threadContext`, deleted threads omitted) in `packages/integrations/azure-devops/src/__tests__/pull-request-threads.test.ts`
- [ ] T016 [P] [S2] Add failing MCP handler/catalog tests for `az_list_pull_request_threads` and `includeContents` on `az_get_pull_request`

### Implementation

- [ ] T017 [S2] Build unified diffs from `lineDiffBlocks` + file lines in `packages/integrations/azure-devops/src/pull-request-detail.ts`; omit contents unless requested
- [ ] T018 [S2] Implement `listPullRequestThreads` in `packages/integrations/azure-devops/src/pull-request-threads.ts` (reuse PR ID/URL resolve); export it
- [ ] T019 [S2] Add `apps/az-mcp/src/tools/list-pull-request-threads.ts`; pass `includeContents` through `get-pull-request.ts`; register in `server.ts`

**Checkpoint**: A PR lookup is review-sized; threads return file/line anchors.

---

## Slice 3 — List + search

**Goal**: List/query rows are enough to pick the next get; agents do not have to write WIQL for common filters.

- [ ] T020 [S3] Widen `WorkItemSummary`; add `SearchWorkItemsFilter` in `types.ts`

### Tests first

- [ ] T021 [S3] Extend list/query tests for new summary fields in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [ ] T022 [S3] Add failing tests for WIQL built from structured filters, `@Me`, title CONTAINS escaping, `changedSince` in the same file
- [ ] T023 [P] [S3] Add failing MCP handler/catalog tests for `az_search_work_items`; update list/query mock summaries

### Implementation

- [ ] T024 [S3] Widen `mapSummary` field list in `queryWorkItems` (no `$expand`)
- [ ] T025 [S3] Implement `searchWorkItems` WIQL builder; export it; add `apps/az-mcp/src/tools/search-work-items.ts` and register it

**Checkpoint**: Search without raw WIQL; summaries include assignee/iteration/parent.

---

## Slice 4 — Routing copy + docs

- [ ] T026 [S4] Rewrite every `registerTool` description (when-to-use / when-not / next tool) and add Zod `.describe()` on every parameter in `apps/az-mcp/src/server.ts`
- [ ] T027 [S4] Update `apps/az-mcp/CLAUDE.md` canonical names and root `CLAUDE.md` az-mcp tools list
- [ ] T028 [S4] Point `specs/001-azure-workitems-mcp/contracts/mcp-tools.md` at this feature’s contract for the widened catalog

**Checkpoint**: `listTools()` descriptions are enough to route get vs hierarchy vs search vs comments vs image vs threads.

---

## Verify

- [ ] T029 Run `npm test --workspace=@hrms/azure-devops` and `npm test --workspace=az-mcp`
- [ ] T030 TypeScript `--noEmit` on both workspaces
