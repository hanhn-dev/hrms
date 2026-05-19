# Implementation Plan: Standardize MCP App Bundling

**Branch**: `[006-add-tsdown-bundling]` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/006-add-tsdown-bundling/spec.md`

## Summary

Replace the current `tsc`-only app build contract for `apps/az-mcp` and `apps/db-mcp` with app-local `tsdown@0.22.0` bundling that preserves `dist/index.js` as the runtime entry, keeps `db-mcp` runtime-sensitive database drivers external, aligns root inspection scripts with the new artifact contract, and records the new build-tool and Node-version policy in repository guidance.

## Technical Context

**Language/Version**: TypeScript 6.x with strict mode; Node.js 22.18+ for build workflows that execute `tsdown`, while emitted MCP app artifacts continue targeting Node.js 20.19+ runtime compatibility  
**Primary Dependencies**: `tsdown@0.22.0`, `@modelcontextprotocol/sdk@1.29.0`, `@hrms/azure-devops`, `@hrms/database-inspector`, `zod@4.4.3`; `db-mcp` keeps `mssql@12.5.0`, `mysql2@3.22.3`, `pg@8.20.0`, and `oracledb@6.10.0` as external runtime dependencies  
**Storage**: N/A - build tooling and documentation change only  
**Testing**: Existing Vitest 4.1 app suites, focused build-contract assertions for package and root scripts, and executable smoke validation of app build/start/inspect flows against bundled artifacts  
**Target Platform**: Node-based stdio MCP server apps in an npm workspace monorepo; local and CI build hosts must satisfy the `tsdown` toolchain requirement  
**Project Type**: Existing monorepo with two server apps, root workspace scripts, feature docs, repo-wide Copilot skills, and constitution guidance  
**Performance Goals**: No material runtime behavior regression for either MCP app; each app build emits the expected `dist/index.js` artifact on the first attempt; root inspection workflows no longer depend on undocumented prebuild drift  
**Constraints**: Latest `tsdown` requires Node 22.18+ to build; runtime artifact path must remain `dist/index.js`; public MCP tool names and schemas stay unchanged; `db-mcp` must not blindly inline runtime-sensitive database drivers; feature scope stays limited to the two MCP apps plus the guidance and validation surfaces needed to keep their build contract aligned  
**Scale/Scope**: Two app package manifests, two app-local bundler configs, selected app test files, root workspace scripts, targeted quickstarts and README guidance, one new build-focused skill under `.github/skills`, `.specify/memory/constitution.md`, and the repo plan pointer in `.github/copilot-instructions.md`

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** — The implementation stays in existing TypeScript app code, app-local `tsdown.config.ts` files, and Markdown guidance artifacts; no JavaScript source is introduced, and public runtime entrypoints remain explicitly typed through the existing app surfaces.
- [x] **II. Functional Programming** — This feature changes build configuration and rollout guidance rather than core business logic; any helper logic for command or artifact validation can stay pure, and side effects remain confined to the build and runtime command boundaries.
- [x] **III. Test-First** — The plan requires failing build-contract assertions before package-script and bundler changes, followed by focused Vitest coverage and executable build/start/inspect validation for the touched apps.
- [x] **IV. UX Consistency** — No visual UI surface changes; consistency work applies to maintainer-facing build commands, runtime artifact paths, and contributor guidance so the two MCP apps follow one understandable contract.
- [x] **V. Performance by Design** — Browser performance budgets are N/A; the design preserves MCP startup behavior, keeps runtime artifact paths stable, and avoids unsafe dependency inlining for `db-mcp`.

## Project Structure

### Documentation (this feature)

```text
specs/006-add-tsdown-bundling/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── build-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── az-mcp/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsdown.config.ts
│   └── src/
│       ├── index.ts
│       └── __tests__/
│           ├── server.test.ts
│           └── build-contract.test.ts
└── db-mcp/
  ├── package.json
  ├── tsconfig.json
  ├── tsdown.config.ts
  ├── README.md
  └── src/
    ├── index.ts
    └── __tests__/
      ├── server.test.ts
      └── build-contract.test.ts

.github/
├── copilot-instructions.md
└── skills/
  └── mcp-app-bundling/
    └── SKILL.md

.specify/
└── memory/
  └── constitution.md

package.json

specs/
├── 001-azure-workitems-mcp/
│   └── quickstart.md
└── 005-db-mcp-app/
  └── quickstart.md
```

**Structure Decision**: Keep the rollout localized to the two existing MCP app packages and the repo-owned guidance surfaces that describe or consume their build artifacts. Each app gets its own `tsdown.config.ts` because `az-mcp` can bundle its internal workspace code more directly, while `db-mcp` needs explicit externalization for runtime-sensitive database drivers. Root scripts and targeted quickstarts are updated to follow the resulting artifact contract, and future guidance lives in one focused build skill plus the constitution.

## Complexity Tracking

> No constitution violations. The feature introduces one new skill file because the repository currently has no MCP app bundling guidance and the user explicitly requested durable skill and constitution updates.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
