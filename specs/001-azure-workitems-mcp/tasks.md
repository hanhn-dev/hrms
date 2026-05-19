---
description: "Task list for Azure Work Items MCP Server"
---

# Tasks: Azure Work Items MCP Server

**Input**: Design documents from `specs/001-azure-workitems-mcp/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/mcp-tools.md ✓, quickstart.md ✓

**Tests**: Included — Test-First is a constitution requirement (plan.md §III). All test tasks must FAIL before implementation begins.

**Packages**:
- `packages/integrations/azure-devops` → `@hrms/azure-devops` (integration library)
- `apps/az-mcp` → MCP server application (private, not published)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold both packages so the workspace resolves correctly and all tooling is in place before any implementation begins.

- [X] T001 Update root `package.json` workspaces array to add `"packages/integrations/*"` so npm resolves the nested `@hrms/azure-devops` package — edit the `workspaces` field in `package.json`
- [X] T002 [P] Create `packages/integrations/azure-devops/package.json` with name `@hrms/azure-devops`, `"type": "module"`, `main`/`exports` pointing to `dist/index.js`, dependencies (`azure-devops-node-api`, `turndown`, `zod`), devDependencies (`@types/turndown`, `@types/node`, `typescript`, `vitest`)
- [X] T003 [P] Create `apps/az-mcp/package.json` with `"private": true`, `"type": "module"`, `main` pointing to `dist/index.js`, dependencies (`@modelcontextprotocol/sdk`, `@hrms/azure-devops`, `zod`), devDependencies (`@types/node`, `typescript`, `vitest`)
- [X] T004 [P] Create `packages/integrations/azure-devops/tsconfig.json` with `strict: true`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `outDir: "dist"`, `rootDir: "src"`, `declaration: true`
- [X] T005 [P] Create `apps/az-mcp/tsconfig.json` with `strict: true`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `outDir: "dist"`, `rootDir: "src"`, `references` to `@hrms/azure-devops` tsconfig
- [X] T006 [P] Add `packages/integrations/azure-devops/vitest.config.ts` (Node environment, coverage provider v8, include `src/__tests__/**`)
- [X] T007 [P] Add `apps/az-mcp/vitest.config.ts` (Node environment, include `src/__tests__/**`)
- [X] T008 Run `npm install` from repo root to install all new workspace dependencies and link `@hrms/azure-devops` internally

**Checkpoint**: Both packages scaffold and resolve; `npm install` exits 0; workspace symlinks are confirmed with `npm ls @hrms/azure-devops`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and the Azure DevOps API client wrapper that every user story implementation depends on. No story can begin until this phase is complete.

**⚠️ CRITICAL**: Do not begin Phase 3, 4, or 5 until all foundational tasks pass TypeScript compilation.

- [X] T009 Define all TypeScript interfaces in `packages/integrations/azure-devops/src/types.ts`: `WorkItem` (all fields readonly per data-model.md), `WorkItemSummary`, `AzureDevOpsConfig`, `ListWorkItemsFilter` — no logic, no tests required
- [X] T010 Implement `AzureDevOpsClient` class in `packages/integrations/azure-devops/src/client.ts`: constructor accepts `AzureDevOpsConfig`, `getWorkItemTrackingApi()` returns a cached `IWorkItemTrackingApi` instance, `getPersonalAccessTokenHandler` for auth — this class owns all I/O and is the only place `azure-devops-node-api` is imported
- [X] T011 Wire public exports in `packages/integrations/azure-devops/src/index.ts`: re-export everything from `types.ts`, `config.ts`, `html-to-text.ts`, `client.ts`, `work-items.ts`
- [X] T012 [P] Implement app-level config module in `apps/az-mcp/src/config.ts`: thin re-export of `loadConfig` from `@hrms/azure-devops` — no additional logic

**Checkpoint**: `npx tsc --noEmit` passes in both packages; `@hrms/azure-devops` types are importable from `apps/az-mcp`

---

## Phase 3: User Story 1 — Retrieve Work Item Details (Priority: P1) 🎯 MVP

**Goal**: An AI agent calls `az_get_work_item(id)` and receives a fully structured `WorkItem` with HTML Description and Acceptance Criteria converted to clean Markdown.

**Independent Test**: Call `az_get_work_item` with a valid ID and verify the response contains Title, Description (Markdown), Acceptance Criteria (Markdown), State, Type, AssignedTo, IterationPath. Call with an invalid ID and verify a `"Work item {id} not found"` error message.

### Tests for User Story 1 ⚠️ Write FIRST — must FAIL before implementation

- [X] T013 [P] [US1] Write failing tests for `htmlToMarkdown()` in `packages/integrations/azure-devops/src/__tests__/html-to-text.test.ts`: (a) converts `<p>` and `<ul>` HTML to Markdown, (b) returns `""` for `null`, (c) returns `""` for `undefined`, (d) returns plain text unchanged
- [X] T014 [P] [US1] Write failing tests for `loadConfig()` in `packages/integrations/azure-devops/src/__tests__/config.test.ts`: (a) returns valid config when all env vars are set, (b) throws `ZodError` when `AZURE_DEVOPS_TOKEN` is missing, (c) throws `ZodError` when `AZURE_DEVOPS_ORG_URL` is not a valid URL
- [X] T015 [P] [US1] Write failing tests for `getWorkItem()` in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`: mock `AzureDevOpsClient`; (a) happy path — returns mapped `WorkItem` with Markdown fields, (b) API returns `null` — rejects with `"Work item {id} not found"`, (c) API throws — rejects with `"Azure DevOps API error: ..."`
- [X] T016 [P] [US1] Write failing tests for `az_get_work_item` tool handler in `apps/az-mcp/src/__tests__/tools/get-work-item.test.ts`: mock `@hrms/azure-devops`; (a) valid ID returns `content[0].text` with serialised `WorkItem`, (b) non-existent ID returns MCP error with `"Work item {id} not found"`, (c) invalid (negative) ID rejected by Zod schema

### Implementation for User Story 1

- [X] T017 [US1] Implement `htmlToMarkdown(html: string | null | undefined): string` using `turndown` in `packages/integrations/azure-devops/src/html-to-text.ts`: guard for null/undefined → return `""`; configure TurndownService with `headingStyle: "atx"` and `bulletListMarker: "-"`
- [X] T018 [US1] Implement `loadConfig(): AzureDevOpsConfig` in `packages/integrations/azure-devops/src/config.ts`: Zod schema `{ orgUrl: z.string().url(), project: z.string().min(1), token: z.string().min(1) }` parsing `process.env`; map `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_TOKEN`; never log token
- [X] T019 [US1] Implement `getWorkItem(client: AzureDevOpsClient, id: number): Promise<WorkItem>` and `mapWorkItem()` helper in `packages/integrations/azure-devops/src/work-items.ts`: fetch with all required field names per data-model.md; apply `htmlToMarkdown` to description and acceptanceCriteria; split tags on `";"`, trim; construct browser `url` from orgUrl + id
- [X] T020 [US1] Implement `az_get_work_item` tool handler in `apps/az-mcp/src/tools/get-work-item.ts`: Zod input `{ id: z.number().int().positive() }`; call `getWorkItem`; return `{ content: [{ type: "text", text: JSON.stringify(workItem) }] }`; map errors to MCP `isError: true` responses with patterns from contracts/mcp-tools.md
- [X] T021 [US1] Implement `createServer(config: AzureDevOpsConfig): Server` in `apps/az-mcp/src/server.ts`: construct `new Server({ name: "azure-workitems-mcp", version: "1.0.0" }, { capabilities: { tools: {} } })`; register `az_get_work_item` tool by calling the handler from T020
- [X] T022 [US1] Implement entry point in `apps/az-mcp/src/index.ts`: `loadConfig()` → `createServer(config)` → `new StdioServerTransport()` → `server.connect(transport)`; wrap in `main()` async function; catch startup errors and write to `process.stderr` (never `stdout`, which is reserved for MCP protocol)

**Checkpoint**: `npm run build --workspace=apps/az-mcp` succeeds; US1 tests pass; `node apps/az-mcp/dist/index.js` starts and accepts MCP `initialize` over stdio; all T013–T016 tests green

---

## Phase 4: User Story 2 — Query and List Work Items (Priority: P2)

**Goal**: An AI agent discovers work items by calling `az_list_work_items` (filtered) or `az_query_work_items` (raw WIQL), receiving `WorkItemSummary[]` for batch context-building and planning.

**Independent Test**: Call `az_list_work_items` with a known project + iteration and verify the returned summaries match the Azure DevOps portal. Call `az_query_work_items` with a WIQL query and verify results. Call both with a filter that returns zero items and verify an empty array (not an error).

### Tests for User Story 2 ⚠️ Write FIRST — must FAIL before implementation

- [X] T023 [P] [US2] Extend `packages/integrations/azure-devops/src/__tests__/work-items.test.ts` with failing tests for `listWorkItems()` and `queryWorkItems()`: mock `AzureDevOpsClient`; (a) list with all filters builds correct WIQL, (b) list with no filters uses only project condition, (c) `top` is clipped to 200, (d) empty result returns `[]`, (e) `queryWorkItems` executes provided WIQL and maps summaries, (f) invalid WIQL propagates `"WIQL query error: ..."` message
- [X] T024 [P] [US2] Write failing tests for `az_list_work_items` handler in `apps/az-mcp/src/__tests__/tools/list-work-items.test.ts`: (a) with all optional params returns serialised `WorkItemSummary[]`, (b) with no params defaults project to config, (c) empty result returns `"[]"`, (d) `top` > 200 is rejected by Zod schema
- [X] T025 [P] [US2] Write failing tests for `az_query_work_items` handler in `apps/az-mcp/src/__tests__/tools/query-work-items.test.ts`: (a) valid WIQL returns serialised summaries, (b) empty WIQL string is rejected by Zod, (c) WIQL error propagates as MCP `isError: true` response

### Implementation for User Story 2

- [X] T026 [US2] Add `listWorkItems(client, filter, config)` and `queryWorkItems(client, wiql, top)` to `packages/integrations/azure-devops/src/work-items.ts`: `listWorkItems` builds WIQL using parameterized field comparisons (quote-escape project/type/state/iteration values); `top` clamped to `[1, 200]`; both call `witApi.queryByWiql` then batch-fetch summaries; return `WorkItemSummary[]`
- [X] T027 [US2] Implement `az_list_work_items` tool handler in `apps/az-mcp/src/tools/list-work-items.ts`: Zod schema `{ project: z.string().min(1).optional(), type: z.string().min(1).optional(), state: z.string().min(1).optional(), iteration: z.string().min(1).optional(), top: z.number().int().min(1).max(200).default(50).optional() }`; delegate to `listWorkItems()`; return `content[0].text` as JSON array
- [X] T028 [US2] Implement `az_query_work_items` tool handler in `apps/az-mcp/src/tools/query-work-items.ts`: Zod schema `{ wiql: z.string().min(1), top: z.number().int().min(1).max(200).default(50).optional() }`; delegate to `queryWorkItems()`; return serialised `WorkItemSummary[]`
- [X] T029 [US2] Register `az_list_work_items` and `az_query_work_items` tools in `apps/az-mcp/src/server.ts` by importing and wiring the handlers from T027 and T028

**Checkpoint**: US2 tests pass; `az_list_work_items` and `az_query_work_items` tools appear in MCP `tools/list` response; empty-result scenario returns `[]` without error

---

## Phase 5: User Story 3 — Expose Work Items as MCP Resources (Priority: P3)

**Goal**: Resource-aware MCP clients (Claude Desktop, etc.) can reference a work item by URI (`azdo://workitem/{id}`) and attach it directly to conversation context without calling a tool.

**Independent Test**: List MCP resources and verify the `azdo://workitem/*` template is declared. Read `azdo://workitem/1234` and verify the response has `mimeType: "application/json"`, `name: "Work Item #1234: ..."`, and `text` content identical in shape to `az_get_work_item`.

### Tests for User Story 3 ⚠️ Write FIRST — must FAIL before implementation

- [X] T030 [P] [US3] Write failing tests for the resource handler in `apps/az-mcp/src/__tests__/resources/work-item-resource.test.ts`: mock `@hrms/azure-devops`; (a) valid URI `azdo://workitem/1234` returns resource with correct `uri`, `name`, `mimeType: "application/json"`, and `text` matching `WorkItem` JSON; (b) non-existent ID returns MCP `isError: true`; (c) malformed URI (non-integer ID) returns error

### Implementation for User Story 3

- [X] T031 [US3] Implement resource read handler in `apps/az-mcp/src/resources/work-item-resource.ts`: export `createWorkItemResource(client)` returning a handler for URIs matching `azdo://workitem/{id}`; parse `id` from URI; call `getWorkItem`; return `{ uri, name: "Work Item #${id}: ${title}", mimeType: "application/json", text: JSON.stringify(workItem) }`
- [X] T032 [US3] Register resource template and read handler in `apps/az-mcp/src/server.ts`: add `resources: { subscribe: false, listChanged: false }` to server capabilities; register URI template `azdo://workitem/{id}` and the read handler from T031

**Checkpoint**: US3 tests pass; MCP `resources/list` returns the `azdo://workitem/{id}` template; resource read returns content consistent with `az_get_work_item` output

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Operational completeness — developer ergonomics, build pipeline integration, and final validation.

- [X] T033 [P] Create `apps/az-mcp/.env.example` with all three required variables (`AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_TOKEN`) with inline comments matching quickstart.md descriptions; never commit `.env`
- [X] T034 [P] Create `.vscode/mcp.json` for VS Code Copilot Agent MCP server configuration per quickstart.md §4: `type: "stdio"`, `command: "node"`, `args: ["apps/az-mcp/dist/index.js"]`, env vars forwarded via `${env:...}` syntax
- [X] T035 [P] Update root `turbo.json` to include `build` and `test` tasks for `apps/az-mcp` and `packages/integrations/azure-devops` in the pipeline dependency graph
- [X] T036 Run full test suite from repo root (`npm test`); verify unit test coverage for `@hrms/azure-devops` is ≥ 80%; fix any failing tests before marking complete
- [X] T037 [P] Validate end-to-end quickstart: follow `specs/001-azure-workitems-mcp/quickstart.md` steps 1–4; confirm VS Code Copilot Agent connects and `az_get_work_item` returns a real work item with Markdown content

**Checkpoint**: All 37 tasks complete; all tests green; coverage ≥ 80%; VS Code MCP client connects and returns work item data

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─► Phase 2 (Foundational)          ← BLOCKS all user story phases
        ├─► Phase 3 (US1 — P1) 🎯 MVP
        ├─► Phase 4 (US2 — P2)        ← independent of US1, but US1 MVP recommended first
        └─► Phase 5 (US3 — P3)        ← independent of US1 and US2
              └─► Phase 6 (Polish)
```

### User Story Dependencies

| Story | Depends on | Independent of |
|-------|-----------|----------------|
| US1 (P1) | Foundational (Phase 2) | US2, US3 |
| US2 (P2) | Foundational (Phase 2) | US1, US3 |
| US3 (P3) | Foundational (Phase 2) + US1 (`getWorkItem` reused) | US2 |

> US3 reuses `getWorkItem()` from `@hrms/azure-devops`, so it should be implemented after US1 is complete even though it is not strictly blocked.

### Within Each User Story

1. Test tasks must be written **before** implementation and must **fail** initially
2. Types / pure functions before service functions
3. Service functions before tool handlers
4. Tool handlers before server registration
5. Server registration before entry point wiring

---

## Parallel Execution Examples

### Phase 1 (all parallel after T001)

```bash
# After T001 (sequential):
# T002, T003, T004, T005, T006, T007 can all run simultaneously
# T008 must wait for T002 and T003
```

### Phase 3 — User Story 1 (tests in parallel, implementation sequential)

```bash
# Tests (all parallel — different files):
# T013 (html-to-text.test.ts)
# T014 (config.test.ts)
# T015 (work-items.test.ts)
# T016 (get-work-item.test.ts)

# Implementation (sequential — each builds on previous):
# T017 → T018 → T019 → T020 → T021 → T022
```

### Phase 4 — User Story 2 (tests in parallel, implementation mostly sequential)

```bash
# Tests (all parallel):
# T023 (extend work-items.test.ts)
# T024 (list-work-items.test.ts)
# T025 (query-work-items.test.ts)

# Implementation:
# T026 (work-items.ts additions)
# T027, T028 (tool handlers — parallel, different files)
# T029 (server registration — depends on T027, T028)
```

---

## Implementation Strategy

**MVP Scope (Phase 1 + Phase 2 + Phase 3 only)**:
- Delivers the highest-value user story (US1 — single work item retrieval for AI prompting)
- Provides a working, deployable MCP server from day one
- All subsequent phases are additive enhancements

**Recommended delivery order**:
1. US1 (P1) — Core value, enables all AI agent use cases
2. US2 (P2) — Unlocks batch/discovery workflows
3. US3 (P3) — Progressive enhancement for resource-aware clients

**Total task count**: 37 tasks across 6 phases
