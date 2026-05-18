---
description: "Task list for Work Item Pull Request Hash Collection"
---

# Tasks: Work Item Pull Request Hash Collection

**Input**: Design documents from `/specs/003-fetch-workitem-prs/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/mcp-tools.md ✓, quickstart.md ✓

**Tests**: Included - Test-First is a constitution requirement in [plan.md](./plan.md). All story test tasks must fail before implementation begins.

**Packages**:
- `packages/integrations/azure-devops` -> `@hrms/azure-devops`
- `apps/az-mcp` -> MCP server application

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel when tasks touch different files and have no dependency on incomplete work
- **[Story]**: Maps a task to a user story (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare dedicated source and test entry points for the new pull-request lookup tool without changing runtime behavior yet.

- [X] T001 Create the pull-request integration module scaffold in `packages/integrations/azure-devops/src/pull-requests.ts`
- [X] T002 [P] Create the MCP tool handler scaffold in `apps/az-mcp/src/tools/get-work-item-pull-requests.ts`
- [X] T003 [P] Create the integration test scaffold in `packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts`
- [X] T004 [P] Create the MCP tool test scaffold in `apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts`

**Checkpoint**: The repository has dedicated source and test entry points for the new PR lookup flow.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared types, client accessors, and reusable work-item fetch support that all user stories depend on.

**⚠️ CRITICAL**: Do not begin user story work until this phase is complete.

- [X] T005 Define `WorkItemPullRequestLookupRequest`, `PullRequestArtifactReference`, `PullRequestCandidate`, `PullRequestHashes`, `PullRequestFilterFacets`, `PullRequestLookupIssue`, `PullRequestLookupResponse`, and `RefinementQuestion` in `packages/integrations/azure-devops/src/types.ts`
- [X] T006 Implement Azure DevOps Git API access and pull-request error helpers in `packages/integrations/azure-devops/src/client.ts`
- [X] T007 Implement reusable relation-rich requested and child work-item fetch helpers in `packages/integrations/azure-devops/src/work-items.ts`
- [X] T008 Export pull-request lookup APIs and shared types from `packages/integrations/azure-devops/src/index.ts`

**Checkpoint**: Shared request and response shapes exist, the integration package can read Git pull requests, and work-item traversal helpers are available to all stories.

---

## Phase 3: User Story 1 - Gather Related Pull Requests Across Work Items (Priority: P1) 🎯 MVP

**Goal**: Discover a deduplicated set of pull requests across requested work items and their immediate child Tasks or Issues.

**Independent Test**: Call `get_work_item_pull_requests` with multiple valid work item IDs and verify the response contains one combined candidate set with no duplicate PRs, includes PRs linked through eligible child work items, and preserves work-item traceability.

### Tests for User Story 1 ⚠️ Write FIRST - must FAIL before implementation

- [X] T009 [P] [US1] Add failing discovery tests for requested work items, immediate child Task or Issue traversal, pull-request artifact parsing, deduplication, and work-item issue reporting in `packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts`
- [X] T010 [P] [US1] Add failing MCP discovery-response tests for candidate totals and issue serialization in `apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts`
- [X] T011 [P] [US1] Extend MCP registration coverage for `get_work_item_pull_requests` input schema in `apps/az-mcp/src/__tests__/server.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement pull-request artifact parsing and immediate eligible-child traversal in `packages/integrations/azure-devops/src/pull-requests.ts`
- [X] T013 [US1] Implement repository-scoped pull-request hydration, deduplication, and related-work-item traceability assembly in `packages/integrations/azure-devops/src/pull-requests.ts`
- [X] T014 [US1] Implement the discovery-stage MCP handler that returns candidate totals and work-item issues in `apps/az-mcp/src/tools/get-work-item-pull-requests.ts`
- [X] T015 [US1] Register the `get_work_item_pull_requests` MCP tool and staged input schema in `apps/az-mcp/src/server.ts`

**Checkpoint**: User Story 1 is independently functional. The tool can discover PR candidates across requested and child work items and return a deduplicated candidate set with traceability.

---

## Phase 4: User Story 2 - Refine the Pull Request Set Interactively (Priority: P2)

**Goal**: Return a staged response that asks which authors, target branches, statuses, and sort options the user wants before the final hash list is returned.

**Independent Test**: Call `get_work_item_pull_requests` without refinement inputs and verify the response returns `stage = needs_refinement`, the total discovered PR count, available authors, target branches, statuses, and the follow-up questions the agent should ask the user.

### Tests for User Story 2 ⚠️ Write FIRST - must FAIL before implementation

- [X] T016 [P] [US2] Extend staged-response tests for facet derivation, question generation, skip-filter behavior, and deterministic default ordering in `packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts`
- [X] T017 [P] [US2] Extend MCP handler tests for `needs_refinement`, `confirmUnfiltered`, and refinement input serialization in `apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts`

### Implementation for User Story 2

- [X] T018 [US2] Implement filter-facet derivation and refinement-question generation in `packages/integrations/azure-devops/src/pull-requests.ts`
- [X] T019 [US2] Implement author, target-branch, and status filtering plus `mergedDate` and `pullRequestId` sorting in `packages/integrations/azure-devops/src/pull-requests.ts`
- [X] T020 [US2] Update the MCP handler to return `needs_refinement` when refinement inputs are absent and honor `confirmUnfiltered` in `apps/az-mcp/src/tools/get-work-item-pull-requests.ts`

**Checkpoint**: User Story 2 is independently functional. The first tool response asks the agent to gather user choices before the final PR list is produced.

---

## Phase 5: User Story 3 - Review a Hash-Focused Summary (Priority: P3)

**Goal**: Return the final filtered or unfiltered PR summary with hashes, totals, and clear empty-result behavior.

**Independent Test**: Provide refinement inputs or confirm unfiltered finalization and verify the final response includes PR identity, author, status, target branch, related work items, hash fields, `candidateTotal`, and `matchingTotal`, with clear handling when no PRs match.

### Tests for User Story 3 ⚠️ Write FIRST - must FAIL before implementation

- [X] T021 [P] [US3] Extend integration tests for merge/source/target hash extraction, final totals, empty-result summaries, and filtered-no-match behavior in `packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts`
- [X] T022 [P] [US3] Extend MCP handler tests for final `complete` payloads with hash fields and total counts in `apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Implement final hash extraction and summary mapping for hydrated pull requests in `packages/integrations/azure-devops/src/pull-requests.ts`
- [X] T024 [US3] Update the MCP handler to serialize final `complete` responses, empty-result summaries, and contract-compliant totals in `apps/az-mcp/src/tools/get-work-item-pull-requests.ts`

**Checkpoint**: User Story 3 is independently functional. The tool returns the final PR hash summary with totals and clear empty-result behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align docs and validate the implemented feature against the staged tool contract.

- [X] T025 Update staged and final response examples in `specs/003-fetch-workitem-prs/contracts/mcp-tools.md`
- [X] T026 Update verification steps and smoke scenarios in `specs/003-fetch-workitem-prs/quickstart.md`
- [X] T027 Run the focused regression commands documented in `specs/003-fetch-workitem-prs/quickstart.md`
- [X] T028 Run build and MCP registration validation for `apps/az-mcp/src/server.ts`
- [X] T029 Record performance verification notes in `specs/003-fetch-workitem-prs/quickstart.md`

**Checkpoint**: The feature is documented, tested, and validated against the staged discovery-to-finalization workflow.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
  -> Phase 2 (Foundational)
      -> Phase 3 (US1 - P1)
          -> Phase 4 (US2 - P2)
              -> Phase 5 (US3 - P3)
                  -> Phase 6 (Polish)
```

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only; this is the MVP and first deliverable.
- **US2 (P2)**: Depends on Phase 2 and builds on the discovered candidate set from US1.
- **US3 (P3)**: Depends on Phase 2 and uses the refinement and candidate-shaping pipeline established in US1 and US2.

### Within Each User Story

- Test tasks must be written and fail before implementation tasks begin.
- Shared integration logic in `packages/integrations/azure-devops/src/pull-requests.ts` comes before MCP handler wiring.
- MCP handler implementation comes before server registration or final response validation.
- Story-specific validation should complete before moving to the next story.

---

## Parallel Opportunities

- `T002`, `T003`, and `T004` can run in parallel during setup because they touch different files.
- `T009`, `T010`, and `T011` can run in parallel for US1 because they cover different test files.
- `T016` and `T017` can run in parallel for US2 because they cover different test files.
- `T021` and `T022` can run in parallel for US3 because they cover different test files.

---

## Parallel Example: User Story 1

```text
T009 packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts
T010 apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts
T011 apps/az-mcp/src/__tests__/server.test.ts
```

## Parallel Example: User Story 2

```text
T016 packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts
T017 apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts
```

## Parallel Example: User Story 3

```text
T021 packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts
T022 apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational prerequisites.
3. Complete Phase 3: User Story 1.
4. Validate the discovery flow with requested work items, eligible child Tasks or Issues, deduplicated PR candidates, and traceability.

### Incremental Delivery

1. Deliver US1 to provide immediate value for collecting related PR candidates from requested and child work items.
2. Deliver US2 to add the interactive staged response that asks which authors, target branches, statuses, and sort field to apply before finalization.
3. Deliver US3 to add the final hash-focused summary with `candidateTotal`, `matchingTotal`, and empty-result handling.
4. Finish with Polish to lock in docs, tests, build health, and performance verification.

### Suggested MVP Scope

- Phase 1
- Phase 2
- Phase 3 (US1)

---

## Notes

- The staged interaction requirement is explicit in this task set: the first tool response must return something the agent can use to ask the user about authors, sort field, status, and target branch before the final hash list is emitted.
- `candidateTotal` belongs to the discovery-stage response and must remain visible in the final response alongside `matchingTotal` so users can see how filtering changed the result.
- Hash extraction should prefer merge commit hashes when available, while still exposing source and target commit hashes for non-merged PRs.