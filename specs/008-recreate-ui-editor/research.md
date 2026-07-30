# Research: Recreate UI Editor

**Phase**: 0 - Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-22

## 1. Application framework and routing

### Decision
Build the feature as a dedicated Vite single-page application in `apps/ui-editor` using React 19.2.6 and React Router 7.15.1, and document this as a deliberate exception to the repository's default Next.js-for-apps rule.

### Rationale
- The editor is an interaction-heavy client surface with drag, resize, layer selection, import review, and side-panel editing; it does not benefit from App Router server rendering.
- Vite 8.0.14 provides faster feedback for canvas-style UI work than a server-first framework and matches the user's stated development preference.
- React Router 7.15.1 gives predictable client-side route segmentation for import, editor, and preview flows without introducing Next.js route-handler conventions that the feature does not need.

### Alternatives considered
- Reusing a Next.js app: rejected because SSR and server route conventions add framework weight without helping the core editor workflow.
- Embedding the feature inside the existing `apps/web` shell: rejected because the editor's routing, bundling, and performance characteristics are materially different from the current web shell.

---

## 2. Supported source import modes for v1

### Decision
Support two import modes in v1: pasted or uploaded HTML snapshots, and uploaded screenshot images. Defer arbitrary live URL crawling and browser-extension capture to later iterations.

### Rationale
- The spec requires a webpage source or captured screen, but a frontend-first product cannot reliably fetch and analyze arbitrary third-party pages because of cross-origin restrictions.
- HTML snapshot import still satisfies the webpage-source workflow while keeping the first implementation local and deterministic.
- Screenshot upload supports the second core acquisition path immediately and creates a common analysis pipeline after normalization.

### Alternatives considered
- Directly crawling any URL from the browser: rejected because cross-origin policies, authentication, and dynamic content make the behavior unreliable.
- Screenshot-only MVP: rejected because it removes the HTML-based recreation path requested in the feature description.

---

## 3. UI system and component-library integration

### Decision
Use Ant Design 6.4.3 as the foundational component library for editor chrome, but expose feature-facing UI through `packages/ui` wrappers and token-aware primitives so the app still complies with the repository design-system rule.

### Rationale
- The feature needs mature panels, trees, drawers, menus, tooltips, and form controls that would be expensive to build from scratch.
- Wrapping `antd` inside `@hrms/ui` keeps the app from coupling directly to raw third-party components at every call site.
- A token bridge between Tailwind utility classes and Ant Design theme variables preserves consistent spacing, color, and typography decisions across the editor surface.

### Alternatives considered
- Building every editor control directly in `@hrms/ui` without Ant Design: rejected because it slows delivery of commodity shell components.
- Importing `antd` directly everywhere in the app: rejected because it bypasses the repository's shared UI boundary and makes later replacement harder.

---

## 4. Styling approach

### Decision
Use Tailwind CSS 4.3.0 with `@tailwindcss/vite` 4.3.0 for the new app, backed by CSS custom properties that mirror the theme values exposed through `@hrms/ui`.

### Rationale
- The editor requires dense, stateful layout composition for canvas overlays, inspectors, guides, and selection states; Tailwind improves the speed of iteration on those view-level concerns.
- Tailwind 4 integrates cleanly with the Vite toolchain requested for the feature.
- CSS variables keep Tailwind utility usage aligned with a shared design-token source instead of scattering hardcoded values.

### Alternatives considered
- CSS Modules only: rejected because the editor shell will involve a high volume of small layout and state classes that are faster to author with utilities.
- Inline styles for layout-heavy areas: rejected because they weaken token reuse and complicate maintainability.

---

## 5. Persistence and sharing model

### Decision
Make the first release local-first: save projects, source captures, revisions, and editor state in IndexedDB, then support sharing through an exported JSON prototype bundle plus a read-only preview route inside the app.

### Rationale
- The spec requires save, reopen, and share flows, but the user did not request a backend platform or collaborative service.
- IndexedDB keeps the MVP aligned with the requested frontend stack and avoids inventing backend infrastructure before the core editing workflow is proven.
- An exported bundle gives a concrete artifact for prototype review while preserving enough source-reference context to compare redesigned output against the original capture.

### Alternatives considered
- Backend-first persistence and sharing service: rejected because it adds auth, storage, and deployment scope not required to validate the core product idea.
- Local storage only: rejected because the expected project payloads and embedded source assets are a better fit for IndexedDB.

---

## 6. Data validation and state boundaries

### Decision
Use Zod 4.4.3 to validate import payloads, route params, persisted project snapshots, exported prototype bundles, and any app configuration loaded at startup; keep editor mutations in pure reducer and transformer functions.

### Rationale
- The feature is driven by user-provided HTML snapshots, screenshots, and persisted JSON, so schema validation needs to exist at every boundary.
- Zod is already accepted in the repository and matches the user's requested stack.
- Reducer-based state transitions keep the editing model testable and compatible with the repository's functional-programming principle.

### Alternatives considered
- Ad hoc runtime guards: rejected because they produce fragmented validation logic and weaker error reporting.
- Class-based editor models: rejected because they encourage stateful mutation and are harder to test deterministically.

---

## 7. Focused validation strategy

### Decision
Use Vitest 4.1.7 for component, reducer, import-pipeline, and persistence tests, and Playwright 1.60.0 for P1 end-to-end coverage across import, manual review, and initial edit flows.

### Rationale
- The core risks in this feature are UI-state correctness and transformation fidelity, which are best covered with focused frontend tests before broader acceptance testing.
- The constitution requires failing tests first and E2E coverage for P1 stories.
- Vite-native tooling keeps the validation loop close to the chosen app stack.

### Alternatives considered
- Build-only validation: rejected because it does not prove import, editing, or persistence behavior.
- E2E-only coverage: rejected because it would make failures harder to localize and slow down iteration.

---

## 8. Exact package baseline

### Decision
Pin the initial implementation to the latest package versions requested by the user at planning time: `vite@8.0.14`, `@vitejs/plugin-react@6.0.2`, `tailwindcss@4.3.0`, `@tailwindcss/vite@4.3.0`, `antd@6.4.3`, `react@19.2.6`, `react-dom@19.2.6`, `react-router@7.15.1`, `zod@4.4.3`, `typescript@6.0.3`, `vitest@4.1.7`, `playwright@1.60.0`, `@types/react@19.2.15`, and `@types/react-dom@19.2.3`.

### Rationale
- The repository constitution requires exact dependency pinning in `package.json`.
- The user explicitly asked for the latest packages.
- Capturing the versions in research avoids ambiguity when implementation begins.

### Alternatives considered
- Leaving versions for implementation time: rejected because "latest" changes over time and would make the plan non-reproducible.
- Using semver ranges: rejected because the constitution disallows range operators in runtime dependencies.
