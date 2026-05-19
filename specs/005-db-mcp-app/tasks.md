# Tasks: Database MCP App

**Input**: Design documents from `/specs/005-db-mcp-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mcp-tools.md, quickstart.md

**Tests**: Tests are required for this feature because the plan and constitution require test-first implementation, including failing unit/MCP tests before code changes and at least one P1 end-to-end scenario.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently once the foundational phase is complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new workspace package and MCP app scaffolding required by the plan.

- [X] T001 Create the shared integration package manifest in packages/integrations/database-inspector/package.json
- [X] T002 [P] Create the shared integration package TypeScript and Vitest configuration in packages/integrations/database-inspector/tsconfig.json and packages/integrations/database-inspector/vitest.config.ts
- [X] T003 [P] Create the db-mcp app manifest in apps/db-mcp/package.json
- [X] T004 [P] Create the db-mcp app TypeScript, Vitest, and environment example files in apps/db-mcp/tsconfig.json, apps/db-mcp/vitest.config.ts, and apps/db-mcp/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared config, core types, engine abstractions, and MCP bootstrap required by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Create failing environment configuration tests in packages/integrations/database-inspector/src/__tests__/config.test.ts
- [X] T006 [P] Create failing MCP bootstrap and tool registration tests in apps/db-mcp/src/__tests__/server.test.ts
- [X] T007 [P] Define shared config, catalog, mutation, and operation result types in packages/integrations/database-inspector/src/types.ts
- [X] T008 [P] Port shared engine connection helpers and connection value types in packages/integrations/database-inspector/src/engines/shared.ts and packages/integrations/database-inspector/src/engines/types.ts
- [X] T009 Implement runtime environment parsing and engine normalization in packages/integrations/database-inspector/src/config.ts
- [X] T010 Implement shared package exports and service entrypoints in packages/integrations/database-inspector/src/index.ts
- [X] T011 Implement the db-mcp app config adapter in apps/db-mcp/src/config.ts
- [X] T012 Implement the db-mcp stdio bootstrap shell in apps/db-mcp/src/index.ts
- [X] T013 Implement the base MCP server factory and shared tool result types in apps/db-mcp/src/server.ts and apps/db-mcp/src/tool-types.ts

**Checkpoint**: Foundation ready. User stories can now be implemented and tested independently.

---

## Phase 3: User Story 1 - Connect And Manage Schema (Priority: P1) 🎯 MVP

**Goal**: Let an AI agent connect through environment-driven configuration, inspect catalog objects, and perform create-table, alter-table, and add-relationship operations.

**Independent Test**: Start the MCP server with valid runtime settings, retrieve the catalog, then complete create-table, alter-table, and add-relationship requests against a supported database without using stored procedure tools.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests first, ensure they fail before implementation.**

- [X] T014 [P] [US1] Create failing catalog and object detail service tests in packages/integrations/database-inspector/src/__tests__/catalog.test.ts
- [X] T015 [P] [US1] Create failing schema mutation service tests in packages/integrations/database-inspector/src/__tests__/mutations/create-table.test.ts, packages/integrations/database-inspector/src/__tests__/mutations/alter-table.test.ts, and packages/integrations/database-inspector/src/__tests__/mutations/add-relationship.test.ts
- [X] T016 [P] [US1] Create failing catalog and schema mutation MCP tool tests in apps/db-mcp/src/__tests__/tools/get-catalog.test.ts, apps/db-mcp/src/__tests__/tools/get-object-details.test.ts, apps/db-mcp/src/__tests__/tools/create-table.test.ts, apps/db-mcp/src/__tests__/tools/alter-table.test.ts, and apps/db-mcp/src/__tests__/tools/add-relationship.test.ts
- [X] T017 [P] [US1] Create a failing SQLite-backed end-to-end schema workflow test in apps/db-mcp/src/__tests__/sqlite-e2e.test.ts

### Implementation for User Story 1

- [X] T018 [P] [US1] Port SQL Server and PostgreSQL catalog inspection logic into packages/integrations/database-inspector/src/engines/sqlserver.ts and packages/integrations/database-inspector/src/engines/postgres.ts
- [X] T019 [P] [US1] Port MySQL, Oracle, and SQLite catalog inspection logic into packages/integrations/database-inspector/src/engines/mysql.ts, packages/integrations/database-inspector/src/engines/oracle.ts, and packages/integrations/database-inspector/src/engines/sqlite.ts
- [X] T020 [US1] Implement catalog and object detail services in packages/integrations/database-inspector/src/catalog.ts and packages/integrations/database-inspector/src/object-details.ts
- [X] T021 [P] [US1] Implement create-table and add-relationship mutation services in packages/integrations/database-inspector/src/mutations/create-table.ts and packages/integrations/database-inspector/src/mutations/add-relationship.ts
- [X] T022 [US1] Implement alter-table mutation planning and execution in packages/integrations/database-inspector/src/mutations/alter-table.ts
- [X] T023 [P] [US1] Implement catalog inspection MCP tool handlers in apps/db-mcp/src/tools/get-catalog.ts and apps/db-mcp/src/tools/get-object-details.ts
- [X] T024 [P] [US1] Implement schema mutation MCP tool handlers in apps/db-mcp/src/tools/create-table.ts, apps/db-mcp/src/tools/alter-table.ts, and apps/db-mcp/src/tools/add-relationship.ts
- [X] T025 [US1] Register schema inspection and mutation tools in apps/db-mcp/src/server.ts

**Checkpoint**: User Story 1 is functional and can be demonstrated as the MVP.

---

## Phase 4: User Story 2 - Inspect Stored Procedure Context (Priority: P2)

**Goal**: Let an AI agent retrieve stored procedure definitions and dependency context from the configured database.

**Independent Test**: Start the MCP server against a database with stored procedures, then retrieve a procedure script and its dependency information without invoking schema mutation tools.

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] Create failing stored procedure service tests in packages/integrations/database-inspector/src/__tests__/procedures.test.ts
- [X] T027 [P] [US2] Create failing stored procedure MCP tool tests in apps/db-mcp/src/__tests__/tools/get-stored-procedure-script.test.ts and apps/db-mcp/src/__tests__/tools/get-stored-procedure-dependencies.test.ts

### Implementation for User Story 2

- [X] T028 [US2] Implement stored procedure script and dependency normalization in packages/integrations/database-inspector/src/procedures.ts
- [X] T029 [US2] Extend engine adapters for stored procedure script and dependency lookup in packages/integrations/database-inspector/src/engines/sqlserver.ts, packages/integrations/database-inspector/src/engines/postgres.ts, packages/integrations/database-inspector/src/engines/mysql.ts, packages/integrations/database-inspector/src/engines/oracle.ts, and packages/integrations/database-inspector/src/engines/sqlite.ts
- [X] T030 [P] [US2] Implement stored procedure MCP tool handlers in apps/db-mcp/src/tools/get-stored-procedure-script.ts and apps/db-mcp/src/tools/get-stored-procedure-dependencies.ts
- [X] T031 [US2] Register stored procedure tools in apps/db-mcp/src/server.ts

**Checkpoint**: User Stories 1 and 2 both work independently through the MCP server.

---

## Phase 5: User Story 3 - Receive Safe, Actionable Results (Priority: P3)

**Goal**: Return clear validation errors, unsupported-operation warnings, and structured failure results across startup, inspection, and mutation flows.

**Independent Test**: Start the MCP server with invalid configuration and submit invalid, unauthorized, or unsupported requests, then confirm every failure returns a structured, actionable result.

### Tests for User Story 3 ⚠️

- [X] T032 [P] [US3] Create failing invalid-configuration and startup error tests in packages/integrations/database-inspector/src/__tests__/config.test.ts and apps/db-mcp/src/__tests__/server.test.ts
- [X] T033 [P] [US3] Create failing permission, unsupported-operation, and missing-object MCP tool tests in apps/db-mcp/src/__tests__/tools/alter-table.test.ts, apps/db-mcp/src/__tests__/tools/add-relationship.test.ts, and apps/db-mcp/src/__tests__/tools/get-stored-procedure-dependencies.test.ts

### Implementation for User Story 3

- [X] T034 [US3] Implement normalized operation-result and error-mapping helpers in packages/integrations/database-inspector/src/types.ts and packages/integrations/database-inspector/src/engines/shared.ts
- [ ] T035 [US3] Add validation and unsupported-operation reporting to inspection and mutation services in packages/integrations/database-inspector/src/catalog.ts, packages/integrations/database-inspector/src/procedures.ts, and packages/integrations/database-inspector/src/mutations/alter-table.ts
- [X] T036 [US3] Surface structured rejection results across MCP tool handlers in apps/db-mcp/src/tools/create-table.ts, apps/db-mcp/src/tools/alter-table.ts, apps/db-mcp/src/tools/add-relationship.ts, apps/db-mcp/src/tools/get-stored-procedure-script.ts, and apps/db-mcp/src/tools/get-stored-procedure-dependencies.ts
- [X] T037 [US3] Harden startup validation and fatal error reporting in apps/db-mcp/src/config.ts and apps/db-mcp/src/index.ts

**Checkpoint**: All three user stories are independently functional with safe failure reporting.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation and workspace-level quality improvements that span multiple stories.

- [X] T038 [P] Document the shipped db-mcp server usage and local development workflow in apps/db-mcp/README.md
- [X] T039 [P] Align the implemented tool contracts and setup guidance in specs/005-db-mcp-app/contracts/mcp-tools.md and specs/005-db-mcp-app/quickstart.md
- [X] T040 [P] Add a root workspace convenience script for inspecting the db-mcp server in package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** — No dependencies; start immediately.
- **Phase 2: Foundational** — Depends on Phase 1 and blocks all user stories.
- **Phase 3: User Story 1** — Depends on Phase 2; delivers the MVP.
- **Phase 4: User Story 2** — Depends on Phase 2; can proceed after foundation, though it will likely touch some of the same engine files as User Story 1.
- **Phase 5: User Story 3** — Depends on Phases 3 and 4 because structured failures must wrap the completed inspection and mutation flows.
- **Phase 6: Polish** — Depends on the user stories you want to ship.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after Phase 2.
- **US2 (P2)**: No hard dependency on US1 after Phase 2, but it reuses the same engine adapter surfaces and should be merged carefully to avoid file conflicts.
- **US3 (P3)**: Depends on the concrete inspection and mutation handlers from US1 and US2 so error shaping can cover the final tool surface.

### Within Each User Story

- Tests must be written and fail before implementation.
- Engine and service-layer work should land before MCP tool handlers.
- Tool registration in apps/db-mcp/src/server.ts comes after the relevant handlers exist.
- End-to-end validation for US1 should run before moving to later stories.

### Parallel Opportunities

- `T002`, `T003`, and `T004` can run in parallel once `T001` creates the shared package path.
- `T005` and `T006` can run in parallel during the foundational test-first pass.
- `T007` and `T008` can run in parallel because they target different foundational files.
- In US1, `T014`, `T015`, `T016`, and `T017` can run in parallel as the initial failing-test batch.
- In US1, `T018` and `T019` can run in parallel by engine family, and `T023` can run in parallel with `T024` after the shared services exist.
- In US2, `T026` and `T027` can run in parallel, and `T030` can proceed once `T028` and `T029` are in place.
- In US3, `T032` and `T033` can run in parallel as the failure-path test batch.
- In Phase 6, `T038`, `T039`, and `T040` can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Write the first failing US1 tests together:
Task: T014 packages/integrations/database-inspector/src/__tests__/catalog.test.ts
Task: T015 packages/integrations/database-inspector/src/__tests__/mutations/create-table.test.ts
Task: T016 apps/db-mcp/src/__tests__/tools/get-catalog.test.ts
Task: T017 apps/db-mcp/src/__tests__/sqlite-e2e.test.ts

# Split engine and handler work after shared services are defined:
Task: T018 packages/integrations/database-inspector/src/engines/sqlserver.ts
Task: T019 packages/integrations/database-inspector/src/engines/mysql.ts
Task: T023 apps/db-mcp/src/tools/get-catalog.ts
Task: T024 apps/db-mcp/src/tools/create-table.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational prerequisites.
3. Complete Phase 3: User Story 1.
4. Validate `apps/db-mcp/src/__tests__/sqlite-e2e.test.ts` and the US1 tool tests before expanding scope.
5. Demo the environment-driven MCP server with schema inspection and mutation flows.

### Incremental Delivery

1. Finish Setup + Foundational to establish the reusable package and thin MCP shell.
2. Deliver US1 as the MVP for catalog inspection and schema mutations.
3. Deliver US2 for stored procedure script and dependency insight.
4. Deliver US3 for hardened, structured failure handling across the full tool surface.
5. Finish Phase 6 documentation and workspace polish before release.

### Parallel Team Strategy

1. One developer can own the shared package scaffolding and foundational config work.
2. A second developer can prepare failing MCP tests in the app shell while the shared package APIs are being established.
3. After Phase 2, engine-port and service work can be split by engine family and by app-vs-package boundaries.
4. Reserve US3 for the point where the final tool surface is stable enough to harden error reporting end to end.

---

## Notes

- `[P]` tasks touch different files and can be parallelized safely.
- `[US1]`, `[US2]`, and `[US3]` labels map each task back to the corresponding user story.
- Every task includes concrete file paths so it can be executed directly without additional repo discovery.
- Keep `db-inspector` app-shell code out of scope; port only the shared Node-safe logic identified in the plan.
- Re-run focused tests after each story checkpoint before opening the next implementation slice.
