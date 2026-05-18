---
description: "Task list for Multiple Work Item Retrieval"
---

# Tasks: Multiple Work Item Retrieval

**Input**: Design documents from `/specs/002-fetch-multiple-work-items/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/mcp-tools.md ✓, quickstart.md ✓

**Tests**: Included — Test-First is a constitution requirement in [plan.md](./plan.md). All story test tasks must fail before implementation begins.

**Packages**:
- `packages/integrations/azure-devops` -> `@hrms/azure-devops`
- `apps/az-mcp` -> MCP server application

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel when tasks touch different files and have no dependency on incomplete work
- **[Story]**: Maps a task to a user story (`[US1]`, `[US2]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing MCP app and integration package for the new multi-item retrieval surface without changing behavior yet.

- [X] T001 Create the new multi-item MCP tool module in `apps/az-mcp/src/tools/get-work-items.ts`
- [X] T002 [P] Create the new multi-item tool test file in `apps/az-mcp/src/__tests__/tools/get-work-items.test.ts`
- [X] T003 [P] Export the planned batch-retrieval types and helpers from `packages/integrations/azure-devops/src/index.ts`

**Checkpoint**: The repository has dedicated source and test entry points for the new tool, and the integration package can expose the new API surface.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared request/result shapes and reusable parsing and Azure DevOps batch support required by all user stories.

**⚠️ CRITICAL**: Do not begin user story implementation until these tasks are complete.

- [X] T004 Define `MultiWorkItemRequest`, `WorkItemRequestEntry`, `WorkItemBatchResult`, and `WorkItemBatchResultEntry` in `packages/integrations/azure-devops/src/types.ts`
- [X] T005 Implement shared comma-separated ID parsing, whitespace trimming, positive-integer validation, duplicate transport deduplication, and 25-ID limit helpers in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T006 Implement Azure DevOps batch detail retrieval with `WorkItemExpand.Relations` and omit-on-error handling in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T007 Preserve raw Azure DevOps error detail needed for omitted-ID follow-up classification in `packages/integrations/azure-devops/src/client.ts`

**Checkpoint**: Shared types exist, valid IDs can be parsed and deduplicated locally, and the integration package has a batch retrieval path optimized for up to 25 IDs.

---

## Phase 3: User Story 1 - Retrieve Several Known Work Items Together (Priority: P1) 🎯 MVP

**Goal**: Let callers retrieve several known work items in one request with the same detail as single-item retrieval while preserving request order and good performance.

**Independent Test**: Call `get_work_items` with `1,2, 3,4` and verify all four work items are returned in that order with the same detail fields provided by `get_work_item`, and the integration layer performs one Azure DevOps batch fetch for the valid IDs.

### Tests for User Story 1 ⚠️ Write FIRST — must FAIL before implementation

- [X] T008 [P] [US1] Extend `packages/integrations/azure-devops/src/__tests__/work-items.test.ts` with failing tests for comma-separated parsing, whitespace tolerance, preserved input order, duplicate-ID transport deduplication, and one `getWorkItems` batch call for successful multi-ID retrieval
- [X] T009 [P] [US1] Add failing successful-retrieval and single-item-compatibility tests in `apps/az-mcp/src/__tests__/tools/get-work-items.test.ts`
- [X] T010 [P] [US1] Extend `apps/az-mcp/src/__tests__/server.test.ts` with a failing test that registers `get_work_items` with a non-empty string `ids` schema while leaving `get_work_item` unchanged

### Implementation for User Story 1

- [X] T011 [US1] Implement happy-path batch retrieval and ordered success-result reconstruction in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T012 [US1] Implement `createGetWorkItemsHandler` to parse `ids`, call the integration batch helper, and serialize `WorkItemBatchResult` in `apps/az-mcp/src/tools/get-work-items.ts`
- [X] T013 [US1] Register the new `get_work_items` MCP tool with its `ids` string schema in `apps/az-mcp/src/server.ts`

**Checkpoint**: User Story 1 is independently functional. Callers can retrieve multiple valid work items in one request, in the same order supplied, without regressing the existing single-item tool.

---

## Phase 4: User Story 2 - Understand Mixed Retrieval Results (Priority: P2)

**Goal**: Return partial successes and item-specific issues when a request mixes valid, invalid, missing, or inaccessible work item IDs.

**Independent Test**: Call `get_work_items` with `1,9999,abc,3` and verify valid work items are still returned, invalid tokens are flagged, missing IDs are identified, inaccessible IDs are reported separately, and the whole request does not fail because of one bad entry.

### Tests for User Story 2 ⚠️ Write FIRST — must FAIL before implementation

- [X] T014 [P] [US2] Extend `packages/integrations/azure-devops/src/__tests__/work-items.test.ts` with failing tests for invalid tokens, repeated or trailing commas, missing IDs, inaccessible IDs, and duplicate IDs appearing in ordered mixed results
- [X] T015 [P] [US2] Extend `apps/az-mcp/src/__tests__/tools/get-work-items.test.ts` with failing tests for partial-success payloads, per-entry error messages, empty-input rejection, and requests above the 25-ID limit

### Implementation for User Story 2

- [X] T016 [US2] Implement Azure DevOps error normalization for `not_found` versus `inaccessible` follow-up failures in `packages/integrations/azure-devops/src/client.ts`
- [X] T017 [US2] Implement omitted-ID follow-up lookups and ordered `invalid`/`not_found`/`inaccessible` result assembly in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T018 [US2] Update `createGetWorkItemsHandler` to return contract-compliant mixed-result and validation messages from `specs/002-fetch-multiple-work-items/contracts/mcp-tools.md` in `apps/az-mcp/src/tools/get-work-items.ts`

**Checkpoint**: User Story 2 is independently functional. Mixed-result requests return partial successes plus item-specific issues without collapsing into a single generic error.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation alignment, and performance smoke validation across the completed feature.

- [X] T019 Update the usage and response examples in `specs/002-fetch-multiple-work-items/quickstart.md` to match the implemented `get_work_items` payload and validation behavior
- [X] T020 Run focused regression tests for `packages/integrations/azure-devops/src/__tests__/work-items.test.ts` and `apps/az-mcp/src/__tests__/tools/get-work-items.test.ts` using the commands documented in `specs/002-fetch-multiple-work-items/quickstart.md`
- [X] T021 Run `npm run test --workspace=apps/az-mcp -- server`, `npm run build --workspace=packages/integrations/azure-devops`, and `npm run build --workspace=apps/az-mcp` to validate MCP registration and TypeScript build health for `apps/az-mcp/src/server.ts`
- [X] T022 Execute the 25-ID performance smoke scenario from `specs/002-fetch-multiple-work-items/quickstart.md` and record any batching or attachment-metadata tuning notes in `specs/002-fetch-multiple-work-items/quickstart.md`

**Checkpoint**: The feature is documented, validated, and performance-checked against the planned batch retrieval path.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
  -> Phase 2 (Foundational)
      -> Phase 3 (US1 - P1)
          -> Phase 4 (US2 - P2)
              -> Phase 5 (Polish)
```

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only; this is the MVP and first deliverable.
- **US2 (P2)**: Depends on Phase 2 and extends the multi-item retrieval path introduced in US1.

### Within Each User Story

- Test tasks must be written and fail before implementation tasks begin.
- Integration-package logic in `packages/integrations/azure-devops/src/work-items.ts` comes before MCP handler wiring.
- MCP handler implementation comes before server registration.
- Story-specific validation should complete before moving to the next story.

---

## Parallel Opportunities

- `T002` and `T003` can run in parallel during setup because they touch different files.
- `T008`, `T009`, and `T010` can run in parallel for US1 because they cover different files.
- `T014` and `T015` can run in parallel for US2 because they cover different files.

---

## Parallel Example: User Story 1

```text
T008 packages/integrations/azure-devops/src/__tests__/work-items.test.ts
T009 apps/az-mcp/src/__tests__/tools/get-work-items.test.ts
T010 apps/az-mcp/src/__tests__/server.test.ts
```

## Parallel Example: User Story 2

```text
T014 packages/integrations/azure-devops/src/__tests__/work-items.test.ts
T015 apps/az-mcp/src/__tests__/tools/get-work-items.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational prerequisites.
3. Complete Phase 3: User Story 1.
4. Validate the `get_work_items` happy path with ordered multi-item results and one batch Azure fetch.

### Incremental Delivery

1. Deliver US1 to provide immediate value for comma-separated multi-item retrieval.
2. Deliver US2 to add mixed-result classification and validation behavior without changing the US1 happy path contract.
3. Finish with Polish to lock in tests, build health, and performance verification.

### Suggested MVP Scope

- Phase 1
- Phase 2
- Phase 3 (US1)

---

## Notes

- Performance is a first-class concern in this task set: valid IDs are parsed and deduplicated locally, then fetched via one Azure DevOps batch call for the common path.
- Follow-up calls are reserved for omitted IDs only, so mixed-result classification does not reintroduce per-ID full-fetch latency for successful requests.
- All tasks use the existing `get_work_item` tool as a regression boundary; the new work must not break current callers.