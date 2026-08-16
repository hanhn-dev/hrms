This file provides guidance to Claude Code when working in `apps/az-mcp`.

## Tool naming convention

- Every public Azure DevOps MCP tool exposed by this app uses the `az_` prefix, with the remainder in descriptive snake_case. Treat the prefixed name as canonical everywhere it's referenced.
- Current canonical names: `az_get_work_item`, `az_get_work_items`, `az_get_work_item_hierarchy_context`, `az_get_pull_request`, `az_get_work_item_pull_requests`, `az_list_work_items`, `az_query_work_items`.
- `src/server.ts` is the runtime source of truth for the public tool catalog — check it before trusting any other doc, test, or example.

## Renaming or adding a public tool

When a change adds or renames a public tool name, propagate it beyond `src/server.ts`:

- Tool invocation and registration tests.
- Root-level and app-level docs, prompts, plans, and examples that mention tool names (e.g. root `CLAUDE.md`'s az-mcp tools table).
- Any checklist or validation artifact asserting specific tool names.

Before calling the rename done, confirm: every affected name begins with `az_`, no stale unprefixed reference remains unless a backward-compatibility decision was made and stated explicitly, and the tool catalog agrees with the surrounding guidance.

## Build tooling

Bundles via `tsdown` using the app-local `tsdown.config.ts`. The runtime artifact is always `dist/index.js` — `build`, `start`, and `inspect` scripts must all agree on that path. If you change build tooling here, also update: this app's `package.json` scripts, root `inspect:az`, any build-contract tests, and maintainer-facing docs describing the build/inspect flow. Keep runtime-sensitive dependencies external rather than bundled when bundling them would weaken reliability.

To produce a handoff zip that does not require the monorepo, run `npm run pack:standalone`. That uses `tsdown.standalone.config.ts`, writes `standalone/dist/index.js`, and packs `standalone/az-mcp-0.0.1.zip`. The bundle inlines `@hrms/azure-devops` while leaving public npm packages (`@modelcontextprotocol/sdk`, `azure-devops-node-api`, `turndown`, `zod`) as runtime dependencies. Recipients follow `standalone/README.md`. Do not copy `standalone/.env` or a PAT into the zip.
