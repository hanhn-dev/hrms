# Quickstart: Standardize MCP App Bundling

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## Goal

Verify that both targeted MCP apps build through `tsdown`, preserve the `dist/index.js` runtime entry, and continue to launch through their documented start and inspection workflows.

## Prerequisites

- Node.js 22.18+ for build workflows that execute `tsdown`
- npm 10+
- Installed workspace dependencies via `npm install`
- Local `.env` files configured for `apps/az-mcp` and `apps/db-mcp` if you want to run live inspection flows

## 1. Install dependencies

From the repository root:

```bash
npm install
```

## 2. Build each targeted MCP app

```bash
npm run build --workspace=apps/az-mcp
npm run build --workspace=apps/db-mcp
```

Expected result:
- each command writes a runnable bundled artifact to `dist/index.js`
- no manual artifact copy or rename step is required after build

## 3. Run focused app regressions

```bash
npm run test --workspace=apps/az-mcp
npm run test --workspace=apps/db-mcp
```

Expected result:
- the MCP server registration and tool-handler tests continue to pass after the bundling change

## 4. Validate runtime launch from bundled output

From each app directory:

```bash
npm run start
```

Expected result:
- the app launches from `dist/index.js`
- startup still reads environment configuration the same way as before the bundling change

## 5. Validate root inspection workflows

From the repository root:

```bash
npm run inspect:az
npm run inspect:db
```

Expected result:
- each command resolves the bundled app artifact under `apps/*/dist/index.js`
- each root `inspect:*` workflow rebuilds its target app before launching the inspector
- the database inspection workflow does not rely on an undocumented extra prebuild step beyond the contract implemented for the app bundle

## 6. Review guidance artifacts

Confirm that the bundling rollout guidance is aligned across:

- `.specify/memory/constitution.md`
- `.github/skills/` build-guidance artifacts added or updated for this feature
- `.github/copilot-instructions.md`

Expected guidance:
- `tsdown` is the approved bundler for the targeted MCP apps
- contributors know the required build-time Node version for bundling workflows
- rollout instructions call out package scripts, root scripts, and documentation surfaces that must stay aligned
