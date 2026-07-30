# Quickstart: Recreate UI Editor

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-22

This quickstart describes how to validate and exercise the implemented Vite-based UI editor.

---

## Prerequisites

- Node.js 22.18+ for local repo workflows
- npm 10+
- A modern desktop browser for the editor runtime

---

## 1. Install workspace dependencies

From the repo root:

```bash
npm install
```

---

## 2. Confirm the pinned stack

The app is already scaffolded with the requested exact versions. If you need to verify or reinstall them, use:

```bash
npm install --workspace=apps/ui-editor --save-exact react@19.2.6 react-dom@19.2.6 react-router@7.15.1 antd@6.4.3 zod@4.4.3
npm install --workspace=apps/ui-editor --save-dev --save-exact vite@8.0.14 @vitejs/plugin-react@6.0.2 tailwindcss@4.3.0 @tailwindcss/vite@4.3.0 typescript@6.0.3 vitest@4.1.7 playwright@1.60.0 @types/react@19.2.15 @types/react-dom@19.2.3
```

These pins reflect the latest versions captured during planning and align with the repository rule that runtime dependencies use exact versions.

---

## 3. Run the development app

```bash
npm run dev --workspace=apps/ui-editor
```

Expected behavior:

- The landing route supports starting an import from an HTML snapshot or screenshot.
- A completed import opens an editable canvas with manual-review markers where recreation confidence is low.
- Saving creates or updates a locally persisted project revision.
- Publishing opens a read-only preview route backed by a published prototype bundle.

---

## 4. Run focused tests first

Use the narrowest checks that match the edited slice:

```bash
npm run test --workspace=apps/ui-editor -- import
npm run test --workspace=apps/ui-editor -- editor
npm run test --workspace=apps/ui-editor -- preview
```

Run P1 end-to-end coverage after the focused tests pass:

npm run test:e2e --workspace=apps/ui-editor
npx playwright test --config apps/ui-editor/tests/e2e/playwright.config.ts
```

---

## 5. Build the app

```bash
npm run build --workspace=apps/ui-editor
```

The build must produce a deployable Vite bundle for the editor shell and preview route.

---

## 6. Exercise the main workflows

Validate the following flows during implementation:

1. Import an HTML snapshot and confirm the app creates an editable draft screen.
2. Import a screenshot and confirm the app creates component groups instead of a flat image-only canvas.
3. Modify content, move components, and add or remove UI elements without losing editability.
4. Save the project, reload the app, and confirm the latest revision restores from IndexedDB.
5. Publish a revision, export a prototype bundle, and open the read-only preview route with that bundle.
6. Import an exported prototype bundle from the landing route and confirm the preview opens without editor controls.

---

## 7. Smoke-check edge cases

Use small fixtures to confirm:

- Low-confidence regions are surfaced for manual review instead of silently omitted.
- Invalid HTML snapshots fail with a clear recovery message.
- Unsupported image formats are rejected before analysis starts.
- Published prototypes open in preview mode without enabling editing controls.
- Reloading the browser preserves the most recent saved revision.
