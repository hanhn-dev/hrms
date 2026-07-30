# UI Editor

The UI Editor is a local-first Vite application for recreating an existing interface from an HTML snapshot or screenshot, editing the generated draft, and publishing a read-only prototype bundle.

## Commands

From the repository root:

```bash
npm run dev --workspace=apps/ui-editor
npm run test --workspace=apps/ui-editor
npm run test:e2e --workspace=apps/ui-editor
npm run build --workspace=apps/ui-editor
```

## Main Workflows

1. Import an HTML snapshot or screenshot from the landing page.
2. Review manual-review markers and refine the generated draft in the editor.
3. Save locally with the `Save draft` action or the `Ctrl+S` / `Cmd+S` shortcut.
4. Publish a revision to open the read-only preview route.
5. Export the published prototype bundle and re-import it on another machine or browser profile.

## Validation Notes

- Unit and integration tests run with Vitest in `jsdom` and use IndexedDB mocks for persistence.
- End-to-end coverage uses Playwright and will self-start the Vite dev server on port `3002`.
- Published bundle previews only support `bundleVersion: 1` and reject draft revisions.