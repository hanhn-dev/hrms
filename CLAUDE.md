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
npm run test --workspace=apps/autofill          # Vitest, run once
npm run test:watch --workspace=apps/autofill     # Vitest, watch mode

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
| `apps/backstage` | Next.js 16 + React 19 | 5001 | Internal docs site — markdown on disk, Entra proposals |
| `apps/az-mcp` | Node MCP server | stdio | Azure DevOps integration for AI tooling |
| `apps/db-mcp` | Node MCP server | stdio | Database schema inspection/mutation for AI tooling |
| `apps/autofill` | Vite 8 + React 19 (MV3) | 9100 | Chrome extension — form scan / random fill / auto-type |
| `apps/troubleshooter` | Next.js 16 + React 19 | 5100 | Internal HRMS data/access operator console |

### Packages

| Package | Purpose |
|---------|---------|
| `packages/hrms-db` (`@hrms/db`) | Shared SQL Server data access for Troubleshooter |
| `packages/integrations/azure-devops` (`@hrms/azure-devops`) | ADO client, work items, PRs, WIQL |
| `packages/integrations/database-inspector` (`@hrms/database-inspector`) | Multi-engine DB catalog and DDL mutations |
| `packages/eslint-config` | Shared ESLint configs (`library`, `next`, `react-internal`) |
| `packages/typescript-config` | Shared `tsconfig` base files |

### MCP apps (az-mcp, db-mcp)

Both follow the same pattern: environment config → `StdioServerTransport` → `McpServer` → Zod-validated tool callbacks → integration library → external API/DB.

**Bundling contract**: MCP apps bundle via `tsdown` with an app-local `tsdown.config.ts`. The runtime artifact is always `dist/index.js`. The `build`, `start`, and `inspect` scripts must all agree on this path. When modifying MCP app build tooling, update: app package manifest, app-local bundler config, root `inspect:*` scripts, and any build-contract tests. See `.github/skills/mcp-app-bundling/SKILL.md` for the full checklist.

**az-mcp tools**: `az_get_work_item`, `az_get_work_item_hierarchy_context`, `az_get_work_items`, `az_get_work_item_comments`, `az_get_work_item_image`, `az_get_work_item_spec_context`, `az_get_work_item_revisions`, `az_get_pull_request`, `az_list_pull_request_threads`, `az_get_work_item_pull_requests`, `az_list_work_items`, `az_search_work_items`, `az_query_work_items`. Prompt: `az_draft_spec_from_work_item`.

**db-mcp tools**: `db_get_catalog`, `db_get_object_details`, `db_create_table`, `db_alter_table`, `db_add_relationship`, `db_get_stored_procedure_script`, `db_get_stored_procedure_dependencies`, `db_execute_stored_procedure`. SQLite is fully validated; PostgreSQL, MySQL, SQL Server, Oracle support read-only catalog and object inspection. `db_execute_stored_procedure` is SQL Server only.

### backstage

Internal documentation site. Full conventions live in `apps/backstage/AGENTS.md` (Claude: `apps/backstage/CLAUDE.md` includes that file).

```bash
npm run backstage                          # from repo root
npm run dev --workspace=apps/backstage     # same
```

Import app modules with `@/` (`@/lib/features`). Do not use parent-relative `../` paths.

### autofill

Chrome MV3 extension (form scan, random fill, keystroke type). Port **9100**. Full layout is in `apps/autofill/AGENTS.md` (Claude: `apps/autofill/CLAUDE.md` includes that file).

```bash
npm run dev --workspace=autofill
npm run build --workspace=autofill
npm run test --workspace=autofill
```

Popup and content script talk to the service worker through `src/shared/messaging.ts`. Do not call `chrome.storage` outside `src/shared/storage.ts`. Components are `antd` only; icons are `@ant-design/icons` only. Tailwind utilities use the `autofill:` prefix.

### troubleshooter

Internal operator console for HRMS data and access diagnostics. Port **5100**. Full layout is in `apps/troubleshooter/AGENTS.md`.

```bash
npm run troubleshooter                              # from repo root
npm run dev --workspace=apps/troubleshooter         # same
```

Import app modules with `@/` (`@/features/employer/picker`, `@/features/employee/access`). Do not use parent-relative `../` paths. Components are `antd` only; icons are `@ant-design/icons` only.

## Key conventions

- **UI libraries**: Form Autofill and Troubleshooter use `antd` + `@ant-design/icons`. Backstage uses Tailwind 4 + `@tailwindcss/typography` (no component library package).
- **Caret dependency ranges**: All `dependencies` use `^` ranges, matching `devDependencies`.
- **Zod at boundaries**: All external inputs — API responses, IndexedDB reads, file uploads, MCP tool arguments — are Zod-validated.
- **postinstall**: `npm install` runs `patch-package`, `fix-next-postcss.mjs`, and `npm dedupe` automatically. Do not skip `postinstall` when troubleshooting Next.js PostCSS issues.
