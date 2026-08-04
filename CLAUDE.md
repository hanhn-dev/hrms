# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# All apps
npm run build          # Turborepo build (respects dependency order)
npm run dev            # Start all apps in watch mode
npm run lint           # Lint all packages
npm run format         # Prettier across all TS/TSX/MD files

# Workspace-scoped (substitute any app or package name)
npm run test --workspace=apps/ui-editor          # Vitest, run once
npm run test:watch --workspace=apps/ui-editor     # Vitest, watch mode
npm run test:e2e --workspace=apps/ui-editor       # Playwright E2E

# Run a single Vitest test file
npx vitest run apps/ui-editor/src/features/editor/__tests__/editor-workflow.test.tsx

# MCP servers (must build first; require .env in the app directory)
npm run inspect:az     # Build az-mcp then open MCP Inspector
npm run inspect:db     # Build db-mcp then open MCP Inspector
npm run start --workspace=apps/az-mcp   # Run az-mcp directly after build
npm run start --workspace=apps/db-mcp   # Run db-mcp directly after build
```

## Architecture

**Turborepo monorepo** — npm workspaces at `apps/*`, `packages/*`, `packages/integrations/*`. Node ≥ 22.18.

### Apps

| App | Framework | Port | Purpose |
|-----|-----------|------|---------|
| `apps/ui-editor` | Vite 8 + React 19 | 9000 | Primary product — local-first UI design editor |
| `apps/az-mcp` | Node MCP server | stdio | Azure DevOps integration for AI tooling |
| `apps/db-mcp` | Node MCP server | stdio | Database schema inspection/mutation for AI tooling |

### Packages

| Package | Purpose |
|---------|---------|
| `packages/ui` (`@hrms/ui`) | Shared React component library — all UI surfaces must source from here |
| `packages/integrations/azure-devops` (`@hrms/azure-devops`) | ADO client, work items, PRs, WIQL |
| `packages/integrations/database-inspector` (`@hrms/database-inspector`) | Multi-engine DB catalog and DDL mutations |
| `packages/eslint-config` | Shared ESLint configs (`library`, `next`, `react-internal`) |
| `packages/typescript-config` | Shared `tsconfig` base files |

### ui-editor (primary active development)

The editor is a client-only SPA — no backend. All persistence is **IndexedDB**.

**Route layout** (`src/app/router.tsx`):
- `/` — Landing page: HTML snapshot or screenshot upload
- `/projects/:projectId` — Editor workspace
- `/projects/:projectId/revisions/:revisionId/preview` — Read-only prototype preview

**State management**: `React Context + useReducer` — `EditorProvider` in `src/app/providers/editor-provider.tsx` wraps the app and exposes `EditorContext`. The reducer in `src/state/editor-reducer.ts` handles all canvas mutations (select, move, resize, text edit, style updates). No external state library.

**Import pipeline** (`src/lib/import/`): HTML snapshot or screenshot upload → normalizer → component-tree builder → `manual-review.ts` flags low-confidence regions → stored as a `ProjectSnapshot` in IndexedDB.

**Storage** (`src/lib/storage/`): `project-store.ts` manages IndexedDB stores for `projectSnapshots` (keyed by project ID) and `prototypeBundles` (keyed by `projectId:revisionId`).

**Zod schemas** (`src/schemas/design-project.ts`): All data structures — `CanvasBounds`, `EditableComponentNode`, `DraftScreen`, `DesignProject`, `PrototypeRevision`, `EditableContent` (discriminated union) — are Zod-validated at every boundary.

**Test setup**: Vitest + `jsdom` + `fake-indexeddb` for unit/integration. Playwright for E2E (`tests/e2e/playwright.config.ts`).

### MCP apps (az-mcp, db-mcp)

Both follow the same pattern: environment config → `StdioServerTransport` → `McpServer` → Zod-validated tool callbacks → integration library → external API/DB.

**Bundling contract**: MCP apps bundle via `tsdown` with an app-local `tsdown.config.ts`. The runtime artifact is always `dist/index.js`. The `build`, `start`, and `inspect` scripts must all agree on this path. When modifying MCP app build tooling, update: app package manifest, app-local bundler config, root `inspect:*` scripts, and any build-contract tests. See `.github/skills/mcp-app-bundling/SKILL.md` for the full checklist.

**az-mcp tools**: `az_get_work_item`, `az_get_work_item_hierarchy_context`, `az_get_work_items`, `az_get_pull_request`, `az_get_work_item_pull_requests`, `az_list_work_items`, `az_query_work_items`.

**db-mcp tools**: `db_get_catalog`, `db_get_object_details`, `db_create_table`, `db_alter_table`, `db_add_relationship`, `db_get_stored_procedure_script`, `db_get_stored_procedure_dependencies`. SQLite is fully validated; PostgreSQL, MySQL, SQL Server, Oracle support read-only catalog and object inspection.

## Key conventions

- **`@hrms/ui` first**: Before creating any new UI component, check `packages/ui`. A net-new component is only allowed if `@hrms/ui` cannot satisfy the requirement, and the new component ships to `@hrms/ui` in the same PR.
- **Caret dependency ranges**: All `dependencies` use `^` ranges, matching `devDependencies`.
- **Zod at boundaries**: All external inputs — API responses, IndexedDB reads, file uploads, MCP tool arguments — are Zod-validated.
- **postinstall**: `npm install` runs `patch-package`, `fix-next-postcss.mjs`, and `npm dedupe` automatically. Do not skip `postinstall` when troubleshooting Next.js PostCSS issues.
