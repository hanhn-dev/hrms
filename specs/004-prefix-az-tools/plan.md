# Implementation Plan: Prefix Azure MCP Tool Names

**Branch**: `[004-prefix-az-tools]` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-prefix-az-tools/spec.md`

## Summary

Rename the public Azure DevOps MCP tool catalog from the current unprefixed names to canonical `az_`-prefixed names, keep each tool's behavior and schemas unchanged, update repository-owned validation and guidance surfaces that present those names, and keep the new workspace skills as the durable guidance for future Azure MCP tool work.

## Technical Context

**Language/Version**: TypeScript 6.x with strict mode, Markdown-based spec and skill artifacts  
**Primary Dependencies**: `@modelcontextprotocol/sdk@1.29.0`, `@hrms/azure-devops`, `zod@4.4.3`, `vitest@4.1.6`  
**Storage**: N/A - stateless rename and documentation rollout only  
**Testing**: Vitest tests in `apps/az-mcp/src/__tests__`; focused validation via MCP server registration and tool handler tests  
**Target Platform**: Node.js 20.19+ or 22.12+ MCP server over `stdio`, plus workspace-shared Copilot customization files under `.github/skills`  
**Project Type**: Existing monorepo with one MCP server app, repository specs/contracts, and workspace-shared Copilot guidance  
**Performance Goals**: No material runtime overhead versus the existing tool catalog; discovery returns the same tool count with renamed identifiers only; renamed tool invocation performs within normal variance of the current handlers  
**Constraints**: Public Azure DevOps MCP names become `az_`-prefixed canonical names; backward-compatibility aliases are out of scope; inputs and outputs remain unchanged; repository-owned canonical references must stay in sync; internal helper names, package names, and resource URIs remain unchanged unless they directly expose a public tool name  
**Scale/Scope**: Five existing Azure DevOps MCP tools in `apps/az-mcp`, their discovery and invocation tests, selected repository specs/contracts/quickstarts/tasks that present canonical tool names, and two workspace skills under `.github/skills`

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** - Runtime changes stay in existing `.ts` sources and tests under `apps/az-mcp`; no JavaScript source is introduced; public runtime APIs remain explicitly typed through the existing server registration surface.
- [x] **II. Functional Programming** - This feature is a naming-contract rollout with no new mutable shared state; any helper logic remains pure and side effects stay at the MCP server boundary.
- [x] **III. Test-First** - Plan requires failing registration and invocation tests for renamed tool names before implementation, followed by focused Vitest coverage for touched MCP tool surfaces.
- [x] **IV. UX Consistency** - No visual UI surface is changed; consistency work is applied to the MCP tool catalog and repository guidance so users see one canonical naming scheme everywhere.
- [x] **V. Performance by Design** - Web performance budgets are N/A; the feature preserves current runtime behavior and network usage because only public names and associated references change.

## Project Structure

### Documentation (this feature)

```text
specs/004-prefix-az-tools/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mcp-tools.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
└── az-mcp/
    └── src/
        ├── server.ts
        └── __tests__/
            ├── server.test.ts
            └── tools/
                ├── get-work-item.test.ts
                ├── get-work-items.test.ts
                ├── get-work-item-pull-requests.test.ts
                ├── list-work-items.test.ts
                └── query-work-items.test.ts

.github/
├── copilot-instructions.md
└── skills/
    ├── az-mcp-tool-naming/
    │   └── SKILL.md
    └── az-mcp-tool-rollout/
        └── SKILL.md

specs/
├── 001-azure-workitems-mcp/
│   ├── contracts/
│   │   └── mcp-tools.md
│   ├── data-model.md
│   ├── plan.md
│   ├── research.md
│   ├── spec.md
│   └── tasks.md
├── 002-fetch-multiple-work-items/
│   ├── contracts/
│   │   └── mcp-tools.md
│   ├── quickstart.md
│   └── tasks.md
└── 003-fetch-workitem-prs/
    ├── contracts/
    │   └── mcp-tools.md
    ├── quickstart.md
    └── tasks.md
```

**Structure Decision**: Keep the runtime rename inside `apps/az-mcp/src/server.ts`, validate it through the existing MCP server and tool tests, and roll the canonical names through the repository-owned contracts and quickstarts that present public tool names. Future guidance remains in workspace-shared skills under `.github/skills` rather than new runtime code.

## Complexity Tracking

> No constitution violations. The feature is a public naming-contract change plus documentation and skill rollout inside existing directories.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
