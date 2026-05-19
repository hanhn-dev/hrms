# Research: Standardize MCP App Bundling

**Phase**: 0 - Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## 1. Bundler version and build-time Node baseline

### Decision
Pin `tsdown` to `0.22.0` for the targeted MCP apps and treat Node `22.18+` as the build-time minimum for workflows that execute `tsdown`.

### Rationale
- The feature request explicitly asks for the latest `tsdown` release.
- The current published `tsdown` documentation states that `tsdown` requires Node `22.18.0` or higher.
- Treating the stricter Node floor as a build-time requirement keeps the plan honest about local setup, CI, and contributor guidance instead of hiding a toolchain mismatch.

### Alternatives considered
- Use an older `tsdown` release that works on the current lower Node baseline: rejected because it would not satisfy the request to use the latest version.
- Keep `tsc` for the apps and skip bundling: rejected because it would not satisfy the feature goal.

---

## 2. Preserve the current runtime artifact path

### Decision
Use app-local `tsdown` configuration for `apps/az-mcp` and `apps/db-mcp` with a single `src/index.ts` entry, Node-targeted ESM output, and explicit output-extension behavior that preserves `dist/index.js` as the runtime entry.

### Rationale
- Both MCP apps currently declare `main: "./dist/index.js"` and their `start` and `inspect` scripts execute `dist/index.js` directly.
- The root convenience scripts and existing feature quickstarts also point at `apps/*/dist/index.js`.
- `tsdown` defaults for Node ESM can emit fixed `.mjs` extensions, so the output behavior must be configured deliberately to avoid unnecessary runtime and documentation churn.

### Alternatives considered
- Accept a new `.mjs` entry path and update every runtime command and document: rejected because the feature only needs to change the build system, not the user-facing runtime path.
- Use one root workspace `tsdown` config for the whole monorepo: rejected because only two app packages are in scope and each app has different dependency constraints.

---

## 3. Bundle internal workspace code but externalize runtime-sensitive drivers

### Decision
Bundle each MCP app from its app entry point while resolving the internal workspace package source into the bundle, but keep runtime-sensitive third-party modules external where bundling would weaken reliability. For `db-mcp`, externalize the database driver packages rather than forcing them into the bundle.

### Rationale
- `apps/az-mcp` depends on `@hrms/azure-devops`; `apps/db-mcp` depends on `@hrms/database-inspector`. Bundling the internal workspace code into the app artifact lets the app build stand on its own instead of requiring a separate prebuild of the shared package for the app runtime.
- `@hrms/database-inspector` depends on `mssql`, `mysql2`, `pg`, and `oracledb`, which are runtime-sensitive database drivers and include native or environment-specific behavior that should not be blindly inlined into an app bundle.
- Externalizing only the risky runtime dependencies keeps the app artifact predictable while reducing the amount of prebuilt workspace output needed to launch the server.

### Alternatives considered
- Keep the current two-step `db-mcp` build that requires building `packages/integrations/database-inspector` separately for app inspection flows: rejected because it preserves the current drift the feature is trying to remove.
- Fully inline every third-party dependency into the `db-mcp` bundle: rejected because native and engine-specific drivers are a high-risk bundling surface.

---

## 4. Validation strategy for the rollout

### Decision
Validate the feature through focused app-level build commands, existing Vitest suites for the two MCP apps, and runtime smoke checks that exercise each app's `start` or `inspect` contract against the bundled output.

### Rationale
- The feature changes the build boundary, so the highest-signal validation is whether the app package can still build and launch from the documented artifact path.
- Both apps already have focused Vitest coverage for their MCP registration and handler surfaces, which provides a fast regression net after changing the build tool.
- Root-level inspection commands are part of the public maintainer workflow and need explicit validation because they currently hardcode bundled artifact paths.

### Alternatives considered
- Rely on `npm run build` for the whole monorepo only: rejected because it is slower and less diagnostic than build checks scoped to the touched apps.
- Treat documentation-only verification as sufficient: rejected because the risk is primarily executable, not editorial.

---

## 5. Guidance rollout mechanism

### Decision
Capture the bundling standard in repository guidance by updating the constitution and adding a build-focused workspace skill under `.github/skills` that teaches contributors how MCP app bundling changes must be rolled out.

### Rationale
- The user explicitly requested updates to relevant skills and constitution documents.
- There is currently no repo skill dedicated to MCP app build-tool or bundling guidance.
- The constitution is the right place to record the toolchain and quality-gate implications of adopting a build tool that raises the required Node version for build workflows.

### Alternatives considered
- Update only feature-local docs in `specs/006-add-tsdown-bundling`: rejected because future contributors would not reliably discover the rule.
- Update only the constitution: rejected because a focused skill is a better discovery mechanism during future implementation work.
