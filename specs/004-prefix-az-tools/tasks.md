---
description: "Task list for Prefix Azure MCP Tool Names"
---

# Tasks: Prefix Azure MCP Tool Names

**Input**: Design documents from `/specs/004-prefix-az-tools/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/mcp-tools.md ✓, quickstart.md ✓

**Tests**: Included where the plan calls for focused regression coverage in `apps/az-mcp/src/__tests__`. Story-specific test tasks must fail before implementation begins.

**Packages**:
- `apps/az-mcp` -> MCP server application
- `.github/skills` -> workspace-shared Copilot guidance
- `specs/*` -> repository-owned contracts, quickstarts, and historical implementation guidance

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel when tasks touch different files and have no dependency on incomplete work
- **[Story]**: Maps a task to a user story (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock the rename contract that every implementation and validation step will follow.

- [X] T001 Freeze the canonical rename matrix and compatibility note in `specs/004-prefix-az-tools/contracts/mcp-tools.md`

**Checkpoint**: The feature has a single source of truth for legacy-to-canonical tool name mappings.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lock the focused validation workflow before runtime and documentation rollout begins.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T002 Freeze the focused regression commands, inspector checks, and expected `az_` catalog output in `specs/004-prefix-az-tools/quickstart.md`

**Checkpoint**: The implementation has a shared validation path for renamed tool discovery, invocation, and build verification.

---

## Phase 3: User Story 1 - Discover and Invoke Prefixed Tools (Priority: P1) 🎯 MVP

**Goal**: Expose the Azure DevOps MCP catalog through canonical `az_` tool names without changing tool behavior.

**Independent Test**: List the Azure DevOps MCP tools and verify the catalog returns `az_get_work_item`, `az_get_work_items`, `az_get_work_item_pull_requests`, `az_list_work_items`, and `az_query_work_items`, then invoke the renamed tools through those canonical names and confirm their behavior is unchanged.

### Tests for User Story 1 ⚠️ Write FIRST - must FAIL before implementation

- [X] T003 [US1] Add failing MCP discovery and invocation assertions for the `az_` catalog in `apps/az-mcp/src/__tests__/server.test.ts`

### Implementation for User Story 1

- [X] T004 [US1] Rename the public Azure DevOps MCP tool registrations to `az_get_work_item`, `az_get_work_items`, `az_get_work_item_pull_requests`, `az_list_work_items`, and `az_query_work_items` in `apps/az-mcp/src/server.ts`
- [X] T005 [US1] Update the runtime rename contract examples to match the implemented MCP catalog in `specs/004-prefix-az-tools/contracts/mcp-tools.md`

**Checkpoint**: User Story 1 is independently functional. MCP discovery and invocation work through the new canonical `az_` names.

---

## Phase 4: User Story 2 - See Consistent Canonical Names Everywhere (Priority: P2)

**Goal**: Update repository-owned validation assets and guidance so canonical Azure DevOps MCP tool references use the prefixed names.

**Independent Test**: Review the affected server tests, contracts, quickstarts, and task documents and verify they present `az_` names as the canonical Azure DevOps MCP tools rather than the retired unprefixed names.

### Tests for User Story 2 ⚠️ Write FIRST - must FAIL before implementation

- [X] T006 [P] [US2] Update canonical tool-name references in `apps/az-mcp/src/__tests__/tools/get-work-item.test.ts` and `apps/az-mcp/src/__tests__/tools/get-work-items.test.ts`
- [X] T007 [P] [US2] Update canonical tool-name references in `apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts`, `apps/az-mcp/src/__tests__/tools/list-work-items.test.ts`, and `apps/az-mcp/src/__tests__/tools/query-work-items.test.ts`

### Implementation for User Story 2

- [X] T008 [P] [US2] Update canonical Azure MCP tool names in `specs/001-azure-workitems-mcp/contracts/mcp-tools.md`, `specs/001-azure-workitems-mcp/spec.md`, `specs/001-azure-workitems-mcp/plan.md`, `specs/001-azure-workitems-mcp/data-model.md`, `specs/001-azure-workitems-mcp/research.md`, and `specs/001-azure-workitems-mcp/tasks.md`
- [X] T009 [P] [US2] Update canonical names and backward-compatibility wording in `specs/002-fetch-multiple-work-items/contracts/mcp-tools.md`, `specs/002-fetch-multiple-work-items/quickstart.md`, and `specs/002-fetch-multiple-work-items/tasks.md`
- [X] T010 [P] [US2] Update canonical names in `specs/003-fetch-workitem-prs/contracts/mcp-tools.md`, `specs/003-fetch-workitem-prs/quickstart.md`, and `specs/003-fetch-workitem-prs/tasks.md`

**Checkpoint**: User Story 2 is independently functional. Canonical repository-owned guidance and validation assets now agree on the prefixed Azure DevOps MCP tool names.

---

## Phase 5: User Story 3 - Reuse the Naming Rule in Future Work (Priority: P3)

**Goal**: Preserve the `az_` naming convention as discoverable workspace guidance for future Azure MCP tool work.

**Independent Test**: Trigger the workspace naming guidance for Azure DevOps MCP work and verify it tells contributors to use the `az_` prefix and to update all affected rollout surfaces when public tool names change.

### Implementation for User Story 3

- [X] T011 [P] [US3] Refine the Azure MCP naming convention guidance in `.github/skills/az-mcp-tool-naming/SKILL.md`
- [X] T012 [P] [US3] Refine the Azure MCP rollout guidance in `.github/skills/az-mcp-tool-rollout/SKILL.md`
- [X] T013 [US3] Align repo-level agent context with the active naming-plan guidance in `.github/copilot-instructions.md`

**Checkpoint**: User Story 3 is independently functional. Future contributors can discover the naming convention and rollout expectations from workspace guidance alone.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full rename rollout, refresh generated artifacts, and close out feature-specific guidance.

- [X] T014 Run the focused regression commands documented in `specs/004-prefix-az-tools/quickstart.md`
- [X] T015 Run build and MCP catalog validation against `apps/az-mcp/src/server.ts`
- [X] T016 Refresh tracked generated output from `apps/az-mcp/dist/server.js` by rebuilding `apps/az-mcp`

**Checkpoint**: The rename is validated across tests, build output, and feature-specific verification steps.

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

- **US1 (P1)**: Depends on Phase 2 only; this is the MVP and first deployable increment.
- **US2 (P2)**: Depends on US1 because repository-owned canonical references should follow the implemented runtime catalog.
- **US3 (P3)**: Depends on US2 because future guidance should reflect the finalized canonical names and rollout surfaces.

### Within Each User Story

- Test tasks must be written and fail before implementation tasks begin.
- Runtime catalog assertions in `apps/az-mcp/src/__tests__/server.test.ts` come before renaming `apps/az-mcp/src/server.ts`.
- Repository guidance updates should follow the implemented runtime names rather than inventing new ones independently.
- Workspace guidance should be finalized after runtime and repository-owned canonical references are settled.

---

## Parallel Opportunities

- `T006` and `T007` can run in parallel because they update disjoint tool-handler test files.
- `T008`, `T009`, and `T010` can run in parallel because they update different feature-document folders under `specs/`.
- `T011` and `T012` can run in parallel because they update different skill files.

---

## Parallel Example: User Story 2

```text
T008 specs/001-azure-workitems-mcp/contracts/mcp-tools.md + specs/001-azure-workitems-mcp/spec.md + specs/001-azure-workitems-mcp/plan.md + specs/001-azure-workitems-mcp/data-model.md + specs/001-azure-workitems-mcp/research.md + specs/001-azure-workitems-mcp/tasks.md
T009 specs/002-fetch-multiple-work-items/contracts/mcp-tools.md + specs/002-fetch-multiple-work-items/quickstart.md + specs/002-fetch-multiple-work-items/tasks.md
T010 specs/003-fetch-workitem-prs/contracts/mcp-tools.md + specs/003-fetch-workitem-prs/quickstart.md + specs/003-fetch-workitem-prs/tasks.md
```

## Parallel Example: User Story 3

```text
T011 .github/skills/az-mcp-tool-naming/SKILL.md
T012 .github/skills/az-mcp-tool-rollout/SKILL.md
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational validation baseline.
3. Complete Phase 3: User Story 1.
4. Validate MCP discovery and invocation through the `az_` catalog before expanding scope.

### Incremental Delivery

1. Deliver US1 to establish the canonical runtime contract.
2. Deliver US2 to align repository-owned tests, contracts, quickstarts, and task documents with that contract.
3. Deliver US3 to preserve the rule in workspace guidance for future Azure MCP work.
4. Finish with Polish to validate tests, build output, and tracked generated artifacts.

### Suggested MVP Scope

- Phase 1
- Phase 2
- Phase 3 (US1)

---

## Notes

- This feature intentionally treats the `az_` names as the only canonical public contract; backward-compatibility aliases are out of scope.
- Historical documents should only retain legacy names when they are explicitly describing prior behavior instead of the current contract.
- Generated output under `apps/az-mcp/dist/**` should be refreshed by build rather than hand-edited.