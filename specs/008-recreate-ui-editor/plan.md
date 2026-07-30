# Implementation Plan: Recreate UI Editor

**Branch**: `008-recreate-ui-editor` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/008-recreate-ui-editor/spec.md`

## Summary

Create a new client-heavy web application, `apps/ui-editor`, that turns HTML snapshots or screenshot captures into an editable UI canvas for redesign work. The app will use Vite 8.0.14 for development and bundling, React 19.2.6 with React Router 7.15.1 for route-driven workflows, Tailwind CSS 4.3.0 plus an Ant Design 6.4.3 theme bridge for the editor shell, and Zod 4.4.3 to validate imports, persisted projects, and exported prototype bundles. The first release is local-first: it recreates one screen at a time, persists projects and revisions in IndexedDB, and shares published revisions through exported JSON bundles and a read-only preview route.

## Technical Context

**Language/Version**: TypeScript 6.0.3 with strict mode; React 19.2.6 for the runtime UI layer  
**Primary Dependencies**: Vite 8.0.14, `@vitejs/plugin-react` 6.0.2, Tailwind CSS 4.3.0, `@tailwindcss/vite` 4.3.0, Ant Design 6.4.3, React Router 7.15.1, Zod 4.4.3  
**Storage**: IndexedDB for local projects, revisions, and source assets; object URLs for transient uploaded files; exported JSON prototype bundles for sharing  
**Testing**: Vitest 4.1.7 for unit/integration coverage; Playwright 1.60.0 for P1 end-to-end scenarios  
**Target Platform**: Modern desktop browsers (Chromium, Edge, Safari, Firefox) with Node.js 22.18+ for local repo workflows  
**Project Type**: New Vite-based React single-page application in the monorepo plus shared `packages/ui` additions  
**Performance Goals**: First meaningful editor paint within 2.5 s for a baseline project, first canvas interaction within 200 ms, import-to-editable-draft feedback within 30 s for supported single-screen sources, and preview route load within 2 s from a local bundle  
**Constraints**: v1 supports HTML snapshots and screenshot uploads only; arbitrary live URL crawling is out of scope; all packages must be pinned to exact versions; `antd` use must flow through `@hrms/ui`; the app must preserve editable output when import confidence is partial; loading, empty, and error states are mandatory for import, save, load, and preview flows  
**Scale/Scope**: One new editor app, additions to `packages/ui`, route-based import/editor/preview flows, client-side component-tree analysis and editing, IndexedDB-backed persistence, prototype bundle export/import, and focused unit/integration/E2E coverage

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** — The planned app, schemas, reducers, and shared UI wrappers all remain in TypeScript with strict-mode configuration, explicit return types on public functions, and no `any`-based escape hatches.
- [x] **II. Functional Programming** — Import normalization, component-tree generation, revision creation, bundle serialization, and editor mutations will be implemented as pure transforms and reducer actions; React components remain function components only, with side effects isolated to persistence and file-loading boundaries.
- [x] **III. Test-First** — The plan requires failing tests first for HTML import normalization, screenshot import analysis, low-confidence review markers, component editing actions, IndexedDB persistence, bundle export/import, route recovery states, and a Playwright P1 journey from import to first edit.
- [x] **IV. UX Consistency** — The feature will introduce editor-facing wrappers in `packages/ui` on top of Ant Design, consume shared tokens through CSS variables, and define explicit loading, empty, and error states for import, project restore, save, publish, and preview flows.
- [x] **V. Performance by Design** — The plan preserves the LCP and interaction budgets for the SPA shell, enforces code-splitting for heavy editor panels, and uses an equivalent browser-asset strategy for imported images; Next.js-specific image handling and framework assumptions are documented as explicit exceptions in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-recreate-ui-editor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── app-contracts.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
└── ui-editor/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── src/
    │   ├── app/
    │   │   ├── router.tsx
    │   │   └── providers/
    │   ├── features/
    │   │   ├── import/
    │   │   ├── editor/
    │   │   ├── preview/
    │   │   └── projects/
    │   ├── lib/
    │   ├── schemas/
    │   ├── state/
    │   └── styles/
    └── tests/
        └── e2e/

packages/
└── ui/
    └── src/
        ├── editor-shell/
        ├── import-review/
        ├── property-panel/
        └── preview-frame/
```

**Structure Decision**: Keep the import workflow, editor state, persistence logic, and route composition inside a dedicated `apps/ui-editor` SPA because the feature is dominated by client-side interaction. Place reusable editor chrome and token-aware wrappers in `packages/ui` so `antd` integration stays behind the shared UI boundary instead of leaking through the app.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Repository default of Next.js for apps | The requested product is a canvas-style SPA built around local import, dense client interaction, and React Router route states; Vite is the chosen development and bundling model for this feature. | Reusing Next.js would add server-first framework complexity and Next-specific routing/image assumptions without improving the core editor workflow. |
| Repository-wide styling consistency rule | The user explicitly requested Tailwind CSS for the feature, and utility-first styling is a better fit for highly dynamic editor overlays and layout states. | CSS Modules alone would slow iteration on the editor shell and make dense interactive state styling more verbose. |
| Next.js-specific image optimization requirement | The Vite SPA must render uploaded screenshots and preview assets without `next/image`, so the feature will use browser-side asset lifecycle management, deferred decoding, and bundle-size budgets instead. | Forcing `next/image` would require switching the app back to Next.js, which conflicts with the chosen architecture and user request. |
