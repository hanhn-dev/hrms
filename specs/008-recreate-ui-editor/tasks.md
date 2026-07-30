# Tasks: Recreate UI Editor

**Input**: Design documents from `/specs/008-recreate-ui-editor/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [contracts/app-contracts.md](./contracts/app-contracts.md)

**Tests**: Test tasks are included because the plan and constitution require test-first delivery, focused unit/integration coverage, and Playwright coverage for P1.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new Vite app, pin the requested dependency versions, and establish the baseline toolchain.

- [X] T001 Create the new Vite app manifest with exact dependency pins in apps/ui-editor/package.json
- [X] T002 [P] Create TypeScript and Vite bootstrap files in apps/ui-editor/tsconfig.json, apps/ui-editor/vite.config.ts, and apps/ui-editor/index.html
- [X] T003 [P] Create runtime entrypoints in apps/ui-editor/src/main.tsx, apps/ui-editor/src/app/router.tsx, and apps/ui-editor/src/styles/index.css
- [X] T004 [P] Configure unit and E2E test runners in apps/ui-editor/vitest.config.ts and apps/ui-editor/tests/e2e/playwright.config.ts
- [X] T005 [P] Prepare shared UI exports for editor wrappers in packages/ui/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared schemas, storage, reducers, and UI primitives required by every story.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T006 Create source, project, and bundle schemas in apps/ui-editor/src/schemas/source-capture.ts, apps/ui-editor/src/schemas/design-project.ts, and apps/ui-editor/src/schemas/prototype-bundle.ts
- [X] T007 [P] Implement import normalization utilities in apps/ui-editor/src/lib/import/html-normalizer.ts and apps/ui-editor/src/lib/import/screenshot-normalizer.ts
- [X] T008 [P] Implement component-tree and manual-review builders in apps/ui-editor/src/lib/import/component-tree-builder.ts and apps/ui-editor/src/lib/import/manual-review.ts
- [X] T009 [P] Implement IndexedDB storage adapters in apps/ui-editor/src/lib/storage/project-store.ts and apps/ui-editor/src/lib/storage/asset-store.ts
- [X] T010 [P] Implement editor and project state reducers in apps/ui-editor/src/state/editor-reducer.ts, apps/ui-editor/src/state/project-reducer.ts, and apps/ui-editor/src/state/selectors.ts
- [X] T011 [P] Create token-aware shared UI wrappers in packages/ui/src/editor-shell.tsx, packages/ui/src/import-review.tsx, packages/ui/src/property-panel.tsx, and packages/ui/src/preview-frame.tsx
- [X] T012 Create app-wide providers in apps/ui-editor/src/app/providers/theme-provider.tsx and apps/ui-editor/src/app/providers/editor-provider.tsx
- [X] T013 Create project loading, empty, and error shells in apps/ui-editor/src/features/projects/project-loader.tsx, apps/ui-editor/src/features/projects/project-empty-state.tsx, and apps/ui-editor/src/features/projects/project-error-state.tsx

**Checkpoint**: Foundation ready. User stories can now proceed in priority order or in parallel where team capacity allows.

---

## Phase 3: User Story 1 - Import Existing UI Into an Editable Canvas (Priority: P1) 🎯 MVP

**Goal**: Let a designer import an HTML snapshot or screenshot and land in an editable draft canvas with manual-review markers for low-confidence regions.

**Independent Test**: Import a valid HTML snapshot or screenshot from the landing route and confirm the app creates a draft project, opens the editor route, preserves source context, and marks unresolved regions without blocking editing.

### Tests for User Story 1

> **NOTE**: Write these tests first, confirm they fail, then implement the story.

- [X] T014 [P] [US1] Add landing-route and import-result contract tests in apps/ui-editor/src/app/__tests__/landing-contract.test.tsx and apps/ui-editor/src/schemas/__tests__/import-result-contract.test.ts
- [X] T015 [P] [US1] Add import-pipeline tests for HTML snapshots, screenshots, and low-confidence regions in apps/ui-editor/src/lib/import/__tests__/import-pipeline.test.ts
- [X] T016 [P] [US1] Add Playwright coverage for the import-to-editor journey in apps/ui-editor/tests/e2e/import-to-editor.spec.ts

### Implementation for User Story 1

- [X] T017 [US1] Implement the landing route and import mode switching in apps/ui-editor/src/features/import/landing-page.tsx and apps/ui-editor/src/features/import/import-mode-tabs.tsx
- [X] T018 [US1] Implement HTML snapshot intake and validation in apps/ui-editor/src/features/import/html-import-form.tsx
- [X] T019 [US1] Implement screenshot upload intake and file validation in apps/ui-editor/src/features/import/screenshot-import-form.tsx
- [X] T020 [US1] Implement import orchestration and project creation in apps/ui-editor/src/features/import/import-workflow.tsx and apps/ui-editor/src/features/projects/create-project.ts
- [X] T021 [US1] Implement initial editor rendering with source-reference context in apps/ui-editor/src/features/editor/editor-page.tsx and apps/ui-editor/src/features/editor/source-reference-panel.tsx
- [X] T022 [US1] Implement manual-review markers and unresolved region listing in apps/ui-editor/src/features/import/manual-review-panel.tsx and apps/ui-editor/src/features/editor/manual-review-overlay.tsx
- [X] T023 [US1] Wire import success navigation and landing-route registration in apps/ui-editor/src/app/router.tsx

**Checkpoint**: User Story 1 should support the MVP flow from import through first editable draft.

---

## Phase 4: User Story 2 - Modify Recreated Components to Explore Redesigns (Priority: P2)

**Goal**: Make the recreated draft meaningfully editable through selection, transform, layer management, and property editing.

**Independent Test**: Open a seeded draft project on `/projects/:projectId`, move and resize components, update content and styling, and confirm the draft remains editable and visually coherent without re-importing.

### Tests for User Story 2

- [X] T024 [P] [US2] Add editor-route contract and load-state tests for `/projects/:projectId` in apps/ui-editor/src/features/projects/__tests__/project-route.test.tsx
- [X] T025 [P] [US2] Add reducer tests for selection, movement, resize, and content updates in apps/ui-editor/src/state/__tests__/editor-reducer.test.ts
- [X] T026 [P] [US2] Add component tests for canvas, layer tree, and inspector interactions in apps/ui-editor/src/features/editor/__tests__/editor-workflow.test.tsx

### Implementation for User Story 2

- [X] T027 [US2] Implement canvas selection, drag, and resize handles in apps/ui-editor/src/features/editor/editor-canvas.tsx
- [X] T028 [US2] Implement layer-tree interactions in apps/ui-editor/src/features/editor/layers-panel.tsx
- [X] T029 [US2] Implement content, style, and bounds editing in apps/ui-editor/src/features/editor/property-inspector.tsx
- [X] T030 [US2] Implement add, remove, and replace component commands in apps/ui-editor/src/features/editor/use-editor-actions.ts and apps/ui-editor/src/features/editor/component-palette.tsx
- [X] T031 [US2] Synchronize editor changes back into draft revision state in apps/ui-editor/src/features/editor/editor-page.tsx and apps/ui-editor/src/state/project-reducer.ts

**Checkpoint**: User Story 2 should allow meaningful redesign work on top of a recreated draft.

---

## Phase 5: User Story 3 - Turn Redesign Drafts Into Shareable Prototypes (Priority: P3)

**Goal**: Persist redesign work locally, reopen projects, and share published revisions through exportable prototype bundles and a read-only preview route.

**Independent Test**: Save a redesigned draft, reopen it from the landing route, publish a revision, export a prototype bundle, and open the preview route for the published revision with editing disabled.

### Tests for User Story 3

- [X] T032 [P] [US3] Add prototype-bundle contract tests and published-revision validation in apps/ui-editor/src/schemas/__tests__/prototype-bundle-contract.test.ts
- [X] T033 [P] [US3] Add persistence tests for save, reopen, and revision versioning in apps/ui-editor/src/lib/storage/__tests__/project-store.test.ts
- [X] T034 [P] [US3] Add preview-route tests and publish-preview E2E coverage in apps/ui-editor/src/features/preview/__tests__/preview-route.test.tsx and apps/ui-editor/tests/e2e/publish-preview.spec.ts

### Implementation for User Story 3

- [X] T035 [US3] Implement draft save and publish actions in apps/ui-editor/src/features/projects/revision-service.ts and apps/ui-editor/src/features/projects/save-status.tsx
- [X] T036 [US3] Implement project resume and reopen flow in apps/ui-editor/src/features/projects/project-list.tsx and apps/ui-editor/src/features/import/landing-page.tsx
- [X] T037 [US3] Implement prototype bundle export and import utilities in apps/ui-editor/src/lib/export/prototype-bundle.ts and apps/ui-editor/src/features/preview/import-bundle.ts
- [X] T038 [US3] Implement the read-only preview surface and unsupported-version handling in apps/ui-editor/src/features/preview/preview-page.tsx and apps/ui-editor/src/features/preview/preview-error-state.tsx
- [X] T039 [US3] Wire preview-route loading and published-revision guards in apps/ui-editor/src/app/router.tsx and apps/ui-editor/src/features/preview/preview-loader.ts

**Checkpoint**: User Story 3 should preserve work across sessions and produce a reviewable prototype artifact.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tighten documentation, performance, accessibility, and workspace integration across all stories.

- [X] T040 [P] Add developer usage and validation notes in apps/ui-editor/README.md and specs/008-recreate-ui-editor/quickstart.md
- [X] T041 Optimize route-level code-splitting in apps/ui-editor/src/app/router.tsx and apps/ui-editor/src/features/editor/editor-page.tsx
- [X] T042 [P] Add keyboard-accessible editor and review-state polish in packages/ui/src/editor-shell.tsx and apps/ui-editor/src/features/editor/property-inspector.tsx
- [X] T043 Validate build, test, and workspace integration scripts in apps/ui-editor/package.json and turbo.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies. Start immediately.
- **Phase 2: Foundational**: Depends on Phase 1. Blocks all user stories.
- **Phase 3: User Story 1**: Depends on Phase 2. Delivers the MVP.
- **Phase 4: User Story 2**: Depends on Phase 2. Can be developed with a seeded draft fixture, but integrates naturally after User Story 1.
- **Phase 5: User Story 3**: Depends on Phase 2. Can be developed with stored draft fixtures, but benefits from User Story 1 import outputs.
- **Phase 6: Polish**: Depends on the completion of the user stories you want in the release.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on later stories. This is the MVP slice.
- **User Story 2 (P2)**: Depends only on the foundational editor data model and route shell, not on live import execution, so it can be tested with seeded draft data.
- **User Story 3 (P3)**: Depends on foundational persistence and schema work, and can be tested with stored fixtures or published revisions created during the story.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Finish schema and reducer work before route wiring that depends on it.
- Implement route or UI shells before the deeper interaction logic that uses them.
- Validate the story independently before moving to the next priority.

### Parallel Opportunities

- `T002`, `T003`, `T004`, and `T005` can run in parallel during setup.
- `T007`, `T008`, `T009`, `T010`, and `T011` can run in parallel once the app scaffold exists.
- In User Story 1, `T014`, `T015`, and `T016` can run together before implementation.
- In User Story 2, `T024`, `T025`, and `T026` can run together before implementation.
- In User Story 3, `T032`, `T033`, and `T034` can run together before implementation.
- Polish tasks `T040` and `T042` can run in parallel after the core stories are stable.

---

## Parallel Example: User Story 1

```bash
# Launch all User Story 1 test tasks together:
Task: "T014 [US1] Add landing-route and import-result contract tests in apps/ui-editor/src/app/__tests__/landing-contract.test.tsx and apps/ui-editor/src/schemas/__tests__/import-result-contract.test.ts"
Task: "T015 [US1] Add import-pipeline tests for HTML snapshots, screenshots, and low-confidence regions in apps/ui-editor/src/lib/import/__tests__/import-pipeline.test.ts"
Task: "T016 [US1] Add Playwright coverage for the import-to-editor journey in apps/ui-editor/tests/e2e/import-to-editor.spec.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch all User Story 2 test tasks together:
Task: "T024 [US2] Add editor-route contract and load-state tests for /projects/:projectId in apps/ui-editor/src/features/projects/__tests__/project-route.test.tsx"
Task: "T025 [US2] Add reducer tests for selection, movement, resize, and content updates in apps/ui-editor/src/state/__tests__/editor-reducer.test.ts"
Task: "T026 [US2] Add component tests for canvas, layer tree, and inspector interactions in apps/ui-editor/src/features/editor/__tests__/editor-workflow.test.tsx"
```

---

## Parallel Example: User Story 3

```bash
# Launch all User Story 3 test tasks together:
Task: "T032 [US3] Add prototype-bundle contract tests and published-revision validation in apps/ui-editor/src/schemas/__tests__/prototype-bundle-contract.test.ts"
Task: "T033 [US3] Add persistence tests for save, reopen, and revision versioning in apps/ui-editor/src/lib/storage/__tests__/project-store.test.ts"
Task: "T034 [US3] Add preview-route tests and publish-preview E2E coverage in apps/ui-editor/src/features/preview/__tests__/preview-route.test.tsx and apps/ui-editor/tests/e2e/publish-preview.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the import-to-editor flow independently with the focused tests and Playwright scenario.
5. Demo the MVP before taking on editing and sharing enhancements.

### Incremental Delivery

1. Deliver Setup + Foundational to stabilize the Vite app, schemas, storage, and shared UI wrappers.
2. Deliver User Story 1 to prove source import and editable draft generation.
3. Deliver User Story 2 to make the draft genuinely useful for redesign work.
4. Deliver User Story 3 to preserve work and share prototypes.
5. Finish with polish tasks that improve accessibility, performance, and docs without changing the core release slices.

### Parallel Team Strategy

1. One developer can own setup and package scaffolding while another prepares shared UI exports.
2. After Phase 2, one developer can focus on import flows, another on editor interactions using seeded fixtures, and another on persistence and preview flows.
3. Merge at story checkpoints so each slice remains independently testable.

---

## Notes

- Every checklist task follows the required `- [ ] T### [P?] [US?] Description with file path` format.
- The task list includes 43 tasks total.
- Story task counts: US1 = 10 tasks, US2 = 8 tasks, US3 = 8 tasks.
- The recommended MVP scope is Phase 3 only after Setup and Foundational are complete.
