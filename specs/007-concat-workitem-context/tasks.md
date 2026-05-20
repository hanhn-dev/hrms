# Tasks: Aggregate Work Item Context

**Input**: Design documents from `specs/007-concat-workitem-context/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/mcp-tools.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirm the feature branch is active and test scaffolding is in place

- [X] T001 Confirm active branch is `007-concat-workitem-context` and all tests in `packages/integrations/azure-devops` and `apps/az-mcp` pass as the green baseline

---

## Phase 2: Foundational — Shared Response Types

**Purpose**: Add the four new TypeScript interfaces to the shared integration package. Every user-story phase depends on these types.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `WorkItemHierarchyContextResponse`, `WorkItemHierarchyContextEntry`, `WorkItemContextMissingFields`, `ImageAttachmentContext`, and `WorkItemHierarchyContextOmission` interfaces to `packages/integrations/azure-devops/src/types.ts`
- [X] T003 Export the five new types from `packages/integrations/azure-devops/src/index.ts`

**Checkpoint**: Foundation ready — exported types compile cleanly and user-story phases can begin.

---

## Phase 3: User Story 1 — Gather Full Hierarchy Context (Priority: P1) 🎯 MVP

**Goal**: A caller provides one root work item ID and receives a single `WorkItemHierarchyContextResponse` containing the root and all readable descendants, each with Description, Acceptance Criteria, image attachment metadata, missing-field flags, and omission notices.

**Independent Test**: Run the integration tests added in this phase; verify a root-with-children fixture produces a response that includes the root, all readable descendants, correct `depth` values, correct `relationToRoot` labels, and no duplicate entries.

### Tests for User Story 1

> **Write these tests FIRST and confirm they FAIL before implementing T009–T013**

- [X] T004 [P] [US1] Add failing Vitest test: root with no children returns one entry with correct shape, no omissions, and all fields in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T005 [P] [US1] Add failing Vitest test: two-level hierarchy (root → child) returns root at depth 0 and child at depth 1 with correct `parentId` in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T006 [P] [US1] Add failing Vitest test: multi-level hierarchy (root → child → grandchild) includes grandchild at depth 2 in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T007 [P] [US1] Add failing Vitest test: same descendant reached via two paths appears exactly once in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T008 [P] [US1] Add failing Vitest test: missing Description, missing Acceptance Criteria, and no image attachments set the corresponding `missing` flags to `true` in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`

### Implementation for User Story 1

- [X] T009 [US1] Implement `collectHierarchyDescendants` pure function that recursively traverses `Hierarchy-Forward` relations, deduplicates IDs, and returns an ordered list of `AzureWorkItem` records for the full descendant tree in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T010 [US1] Implement `mapImageAttachmentContext` pure function that converts a `WorkItemAttachment` with `isImage === true` to `ImageAttachmentContext` with a correctly formed `azdo://workitem/{id}/images/{attachmentId}` `resourceUri` in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T011 [US1] Implement `mapWorkItemHierarchyContextEntry` pure function that maps a fetched `WorkItem`, its depth, and its relation-to-root label into a `WorkItemHierarchyContextEntry` in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T012 [US1] Implement `getWorkItemHierarchyContext` async function that: fetches the root with `WorkItemExpand.Relations`, builds the descendant tree via T009, maps each readable item via T010–T011, collects omission notices for unreadable descendants, and returns the full `WorkItemHierarchyContextResponse` in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T013 [US1] Export `getWorkItemHierarchyContext` from `packages/integrations/azure-devops/src/index.ts`

**Checkpoint**: All T004–T008 tests pass. `getWorkItemHierarchyContext` is callable in isolation.

---

## Phase 4: User Story 2 — Preserve Source Traceability (Priority: P2)

**Goal**: Every returned content block and image reference in the hierarchy response identifies its source work item, and missing content is flagged explicitly rather than left implicit.

**Independent Test**: Request combined context for a multi-item hierarchy and verify that each `items` entry carries its correct `workItemId`, `depth`, `relationToRoot`, `parentId`, and that entries with absent Description or Acceptance Criteria have the matching `missing` flag set to `true`.

### Tests for User Story 2

> **Write these tests FIRST and confirm they FAIL before implementing T017–T018**

- [X] T014 [P] [US2] Add failing Vitest test: each image attachment entry carries the correct `workItemId`-derived `resourceUri` for its source item in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T015 [P] [US2] Add failing Vitest test: an entry with a present Description and absent Acceptance Criteria has `missing.description === false` and `missing.acceptanceCriteria === true` in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T016 [P] [US2] Add failing Vitest test: an entry with no image attachments has `missing.imageAttachments === true` and an empty `imageAttachments` array in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Update `mapWorkItemHierarchyContextEntry` (T011) to compute all three `missing` field flags from the mapped `WorkItem` data in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T018 [US2] Update `mapImageAttachmentContext` (T010) to exclude non-image attachments and verify the `resourceUri` template uses the correct source `workItemId` in `packages/integrations/azure-devops/src/work-items.ts`

**Checkpoint**: T014–T016 tests pass. Traceability and missing-field flags are verified independently.

---

## Phase 5: User Story 3 — Continue Through Partial Gaps (Priority: P3)

**Goal**: An inaccessible or missing descendant work item results in an omission notice while readable items are still returned. An unreadable root returns a clear hard error.

**Independent Test**: Request combined context for a hierarchy where at least one descendant cannot be read; verify the response still returns the readable items and that `omissions` contains one entry with the correct `workItemId`, `status`, and `message`.

### Tests for User Story 3

> **Write these tests FIRST and confirm they FAIL before implementing T022–T023**

- [X] T019 [P] [US3] Add failing Vitest test: inaccessible descendant produces an `omissions` entry with `kind === 'work_item'` and `status === 'inaccessible'` while readable items remain in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T020 [P] [US3] Add failing Vitest test: not-found descendant produces an `omissions` entry with `status === 'not_found'` in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`
- [X] T021 [P] [US3] Add failing Vitest test: unreadable root work item causes the function to throw or return a hard error rather than a partial response in `packages/integrations/azure-devops/src/__tests__/work-items.test.ts`

### Implementation for User Story 3

- [X] T022 [US3] Update `collectHierarchyDescendants` (T009) to catch per-descendant fetch errors and accumulate `WorkItemHierarchyContextOmission` records with the appropriate `not_found`, `inaccessible`, or `metadata_unavailable` status in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T023 [US3] Update `getWorkItemHierarchyContext` (T012) to merge descendant omission notices into the top-level `omissions` array and set `omittedCount` correctly in `packages/integrations/azure-devops/src/work-items.ts`

**Checkpoint**: T019–T021 tests pass. Partial-gap behavior is independently verified.

---

## Phase 6: MCP Tool Registration and Handler

**Purpose**: Wire `getWorkItemHierarchyContext` into the az-mcp server as the public `az_get_work_item_hierarchy_context` tool.

**⚠️ Depends on**: Phase 3 (T012–T013), Phase 4 (T017–T018), Phase 5 (T022–T023)

- [X] T024 Add failing Vitest test: `az_get_work_item_hierarchy_context` tool is present in the catalog with the correct `id: integer` input schema in `apps/az-mcp/src/__tests__/server.test.ts`
- [X] T025 Add failing Vitest test: handler serializes the `WorkItemHierarchyContextResponse` into `content[0].text` without `isError` in `apps/az-mcp/src/__tests__/tools/get-work-item-hierarchy-context.test.ts`
- [X] T026 Add failing Vitest test: handler returns `isError: true` and the correct message when `getWorkItemHierarchyContext` throws in `apps/az-mcp/src/__tests__/tools/get-work-item-hierarchy-context.test.ts`
- [X] T027 Create `apps/az-mcp/src/tools/get-work-item-hierarchy-context.ts` with `createGetWorkItemHierarchyContextHandler` following the same shape as `apps/az-mcp/src/tools/get-work-item.ts`
- [X] T028 Register `az_get_work_item_hierarchy_context` with schema `{ id: z.number().int().positive() }` and wire to the handler in `apps/az-mcp/src/server.ts`

**Checkpoint**: T024–T026 tests pass. The tool appears in the catalog and serializes correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T029 [P] Run the full test suite for both packages and confirm no regressions: `npm run test --workspace=packages/integrations/azure-devops && npm run test --workspace=apps/az-mcp`
- [X] T030 [P] Update `specs/007-concat-workitem-context/quickstart.md` smoke-check notes if any implementation detail changed from the plan
- [X] T031 [P] Update `specs/001-azure-workitems-mcp/contracts/mcp-tools.md` to reference the new `az_get_work_item_hierarchy_context` tool alongside the existing catalog entries

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational Types)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US1 — Hierarchy Traversal)**: Depends on Phase 2.
- **Phase 4 (US2 — Traceability)**: Depends on Phase 2. Can begin after Phase 3 test baseline is green; T017–T018 update the same functions started in T009–T011.
- **Phase 5 (US3 — Partial Gaps)**: Depends on Phase 2. Can begin after Phase 3 baseline; T022–T023 extend the same functions.
- **Phase 6 (MCP Registration)**: Depends on Phase 3, 4, and 5.
- **Phase 7 (Polish)**: Depends on Phase 6.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2).
- **US2 (P2)**: Can start after Foundational (Phase 2); refines functions introduced in US1.
- **US3 (P3)**: Can start after Foundational (Phase 2); extends traversal started in US1.

### Within Each User Story

- Tests (T004–T008, T014–T016, T019–T021) MUST be written and confirmed FAILING before the matching implementation tasks.
- Integration-package tests before app-layer wiring.
- All three user stories MUST be complete before Phase 6.

### Parallel Opportunities

- T004–T008 can all be written in parallel (different test cases, same file).
- T014–T016 can all be written in parallel.
- T019–T021 can all be written in parallel.
- T024–T026 (app-layer tests) can be written in parallel with T027 (handler implementation).
- T029, T030, T031 (Phase 7) can run in parallel.

---

## Parallel Example: User Story 1 Tests

```bash
# All US1 test stubs can be written in one pass (same file, independent cases):
Task T004: "root with no children returns one entry"
Task T005: "two-level hierarchy produces depth 0 and depth 1 entries"
Task T006: "multi-level hierarchy includes grandchild at depth 2"
Task T007: "same descendant via two paths appears exactly once"
Task T008: "missing content fields set missing flags to true"
```

---

## Implementation Strategy

### MVP First (Phase 1–3 + Phase 6)

1. Complete Phase 1: Setup baseline.
2. Complete Phase 2: Export shared types.
3. Complete Phase 3: Hierarchy traversal and context assembly (US1).
4. Complete Phase 6: MCP registration.
5. **STOP and VALIDATE**: The tool is callable and returns aggregated hierarchy context.

### Incremental Delivery

1. Phase 1 + 2 → types ready.
2. Phase 3 → root-plus-descendants content assembly works independently.
3. Phase 4 → traceability and missing-field flags verified independently.
4. Phase 5 → partial-gap resilience verified independently.
5. Phase 6 → tool is wired and catalog-visible.
6. Phase 7 → full suite green, docs aligned.
