---
description: "Task list for Standardize MCP App Bundling"
---

# Tasks: Standardize MCP App Bundling

**Input**: Design documents from `/specs/006-add-tsdown-bundling/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/build-contract.md ✓, quickstart.md ✓

**Tests**: Included. The plan and constitution require test-first implementation plus executable validation of build, start, and inspect workflows for the touched MCP apps.

**Packages**:
- `apps/az-mcp` -> Azure DevOps MCP server application
- `apps/db-mcp` -> Database MCP server application
- `.github/skills` -> workspace-shared Copilot guidance
- `.specify/memory/constitution.md` -> repository constitution guidance

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel when tasks touch different files and have no dependency on incomplete work
- **[Story]**: Maps a task to a user story (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the requested bundler and establish the shared workspace baseline needed for the rollout.

- [X] T001 Update the root workspace toolchain in `package.json` and `package-lock.json` to pin `tsdown@0.22.0` and align the documented Node build baseline for bundling workflows

**Checkpoint**: The workspace can install and invoke the approved bundler version consistently.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared validation baseline before either MCP app’s bundling contract changes.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T002 Create the shared failing bundle-contract regression baseline in `apps/az-mcp/src/__tests__/build-contract.test.ts` and `apps/db-mcp/src/__tests__/build-contract.test.ts` so later story work can prove the `dist/index.js` contract explicitly

**Checkpoint**: The feature has one focused regression surface for app and workspace bundling behavior.

---

## Phase 3: User Story 1 - Build And Launch Bundled MCP Apps (Priority: P1) 🎯 MVP

**Goal**: Build `apps/az-mcp` and `apps/db-mcp` with `tsdown` while preserving `dist/index.js` as the runnable artifact for app-level start and inspect workflows.

**Independent Test**: From a clean workspace, run each app package build, then run each app package `start` or `inspect` workflow and verify the process launches from `dist/index.js` without manual artifact copying or a separate internal-package prebuild.

### Tests for User Story 1 ⚠️ Write FIRST - must FAIL before implementation

- [X] T003 [P] [US1] Add failing Azure MCP bundling assertions in `apps/az-mcp/src/__tests__/build-contract.test.ts` covering the `tsdown` build script, preserved `dist/index.js` artifact path, and app-level `start` and `inspect` scripts
- [X] T004 [P] [US1] Add failing database MCP bundling assertions in `apps/db-mcp/src/__tests__/build-contract.test.ts` covering the `tsdown` build script, preserved `dist/index.js` artifact path, app-level `start` and `inspect` scripts, and externalized database-driver runtime dependencies

### Implementation for User Story 1

- [X] T005 [US1] Implement the Azure MCP bundle contract in `apps/az-mcp/package.json` and `apps/az-mcp/tsdown.config.ts` so the app builds from `src/index.ts` to `dist/index.js` through `tsdown`
- [X] T006 [US1] Implement the database MCP bundle contract in `apps/db-mcp/package.json` and `apps/db-mcp/tsdown.config.ts` so the app builds from `src/index.ts` to `dist/index.js` through `tsdown` while keeping runtime-sensitive database drivers external

**Checkpoint**: User Story 1 is independently functional. Both app packages build and launch from their bundled `dist/index.js` outputs.

---

## Phase 4: User Story 2 - Keep Build Workflows Consistent Across Both Apps (Priority: P2)

**Goal**: Align root workspace inspection workflows and maintainer-facing build documentation with the bundled output contract for both MCP apps.

**Independent Test**: Review and execute the app-level and root-level build and inspection commands for both targeted MCP apps and verify they all resolve the same bundled artifact paths without undocumented prebuild exceptions.

### Tests for User Story 2 ⚠️ Write FIRST - must FAIL before implementation

- [X] T007 [P] [US2] Extend `apps/az-mcp/src/__tests__/build-contract.test.ts` with failing assertions for the root `inspect:az` workflow in `package.json` and its continued use of `apps/az-mcp/dist/index.js`
- [X] T008 [P] [US2] Extend `apps/db-mcp/src/__tests__/build-contract.test.ts` with failing assertions for the root `inspect:db` workflow in `package.json` so it resolves `apps/db-mcp/dist/index.js` without a redundant `packages/integrations/database-inspector` prebuild

### Implementation for User Story 2

- [X] T009 [US2] Align the root workspace inspection workflows in `package.json` with the bundled app contracts for `inspect:az` and `inspect:db`
- [X] T010 [P] [US2] Update the Azure MCP maintainer workflow in `specs/001-azure-workitems-mcp/quickstart.md` to describe the bundled app build and runtime contract
- [X] T011 [P] [US2] Update the database MCP maintainer workflow in `specs/005-db-mcp-app/quickstart.md` and `apps/db-mcp/README.md` to describe the bundled app build and runtime contract

**Checkpoint**: User Story 2 is independently functional. App-level and root-level workflows now agree on how both MCP apps are built and launched.

---

## Phase 5: User Story 3 - Preserve The Bundling Standard In Repository Guidance (Priority: P3)

**Goal**: Record the approved MCP app bundling rule in durable contributor guidance so future build-tool changes update the same rollout surfaces.

**Independent Test**: Review repository guidance and verify that a contributor can identify the approved MCP app bundler, the build-time Node requirement, and the files that must stay aligned when the bundling contract changes.

### Implementation for User Story 3

- [X] T012 [P] [US3] Amend the build-tool and Node-version governance in `.specify/memory/constitution.md` for MCP app bundling workflows
- [X] T013 [P] [US3] Create the bundling rollout skill in `.github/skills/mcp-app-bundling/SKILL.md` so contributors can discover the approved MCP app bundling standard
- [X] T014 [US3] Align repo-level agent context with the bundling guidance in `.github/copilot-instructions.md`

**Checkpoint**: User Story 3 is independently functional. Contributors can discover and apply the bundling standard from repository guidance alone.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize feature-local validation assets and execute the documented verification path.

- [X] T015 [P] Refresh the implementation-specific validation guidance in `specs/006-add-tsdown-bundling/contracts/build-contract.md` and `specs/006-add-tsdown-bundling/quickstart.md`
- [X] T016 Run the bundled app validation workflow documented in `specs/006-add-tsdown-bundling/quickstart.md`

**Checkpoint**: The rollout is validated across tests, package builds, root inspection workflows, and feature-local guidance.

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
- **US2 (P2)**: Depends on US1 because root workflows and maintainer docs should follow the implemented app bundle contract rather than diverge from it.
- **US3 (P3)**: Depends on US2 because repository guidance should describe the finalized build contract and rollout surfaces.

### Within Each User Story

- Test tasks must be written and fail before implementation tasks begin.
- App-local bundle configuration should be completed before workspace-level workflow alignment.
- Workflow docs should follow the implemented package and root script behavior rather than invent a contract independently.
- Guidance updates should be finalized after runtime and workflow validation surfaces are settled.

---

## Parallel Opportunities

- `T003` and `T004` can run in parallel because they add separate app-level build-contract tests.
- `T005` and `T006` can run in parallel because they update different app package manifests and bundler config files.
- `T007` and `T008` can run in parallel because they extend different app test files.
- `T010` and `T011` can run in parallel because they update different documentation surfaces.
- `T012` and `T013` can run in parallel because they update different guidance files.

---

## Parallel Example: User Story 1

```text
T003 apps/az-mcp/src/__tests__/build-contract.test.ts
T004 apps/db-mcp/src/__tests__/build-contract.test.ts

T005 apps/az-mcp/package.json + apps/az-mcp/tsdown.config.ts
T006 apps/db-mcp/package.json + apps/db-mcp/tsdown.config.ts
```

## Parallel Example: User Story 2

```text
T010 specs/001-azure-workitems-mcp/quickstart.md
T011 specs/005-db-mcp-app/quickstart.md + apps/db-mcp/README.md
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational validation baseline.
3. Complete Phase 3: User Story 1.
4. Validate both app packages build and launch from `dist/index.js` before expanding scope.

### Incremental Delivery

1. Deliver US1 to establish the app-level bundling contract.
2. Deliver US2 to align root workflows and maintainer-facing documentation with that contract.
3. Deliver US3 to preserve the rule in durable repository guidance.
4. Finish with Polish to refresh feature-local validation docs and run the documented checks.

### Suggested MVP Scope

- Phase 1
- Phase 2
- Phase 3 (US1)

---

## Notes

- The task list intentionally keeps runtime artifact paths stable at `dist/index.js` instead of treating a new extension as acceptable churn.
- `db-mcp` bundling work must preserve external runtime resolution for `mssql`, `mysql2`, `pg`, and `oracledb`.
- Root inspection workflow updates should remove redundant prebuild drift rather than re-encode it in new commands.
- Guidance changes are part of the requested feature, not optional follow-up work.
