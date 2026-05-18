# Implementation Plan: Work Item Pull Request Hash Collection

**Branch**: `003-fetch-workitem-prs` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-fetch-workitem-prs/spec.md`

## Summary

Add a new Azure DevOps MCP tool that gathers pull requests linked to up to 25 requested work items plus their immediate child Tasks and Issues, deduplicates pull requests across all contributing work items, and exposes commit hashes with traceability. The interaction is intentionally two-stage: an initial call without refinement inputs returns the total candidate count plus available authors, target branches, statuses, and supported sort fields so the agent can ask the user follow-up questions before a second call returns the final hash-focused PR list.

## Technical Context

**Language/Version**: TypeScript 6.x, strict mode, Node.js 20.19+ or 22.12+  
**Primary Dependencies**: `@modelcontextprotocol/sdk@1.29.0`, `azure-devops-node-api@15.1.2`, `zod@4.4.3`  
**Storage**: N/A - stateless; work items and pull requests are fetched live from Azure DevOps APIs  
**Testing**: Vitest unit and integration tests in `packages/integrations/azure-devops` and `apps/az-mcp`  
**Target Platform**: Node.js MCP server over `stdio`, launched by MCP clients such as VS Code Copilot Agent  
**Project Type**: Existing MCP server app (`apps/az-mcp`) plus shared Azure DevOps integration package (`packages/integrations/azure-devops`)  
**Performance Goals**: Initial candidate discovery for up to 25 requested work items completes in <= 10 s under normal network conditions; refinement and sorting over an already hydrated candidate set adds <= 1 s; final response always includes total PR counts before and after filtering  
**Constraints**: Read-only behavior only; include direct work-item PR links and immediate child Task/Issue PR links; deduplicate by repository and PR identity; preserve work-item traceability per PR; first response must surface filter questions before the final hash list when refinement inputs are absent; support unfiltered finalization when the user explicitly skips filtering  
**Scale/Scope**: One incremental MCP tool plus shared integration support, new response types, and focused tests across two packages; guaranteed support for up to 25 top-level requested work item IDs per call

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** - Planned implementation remains in `.ts` files under existing packages; repo already uses `strict: true`; new public integration and tool APIs will carry explicit return types and shared shapes will live in `packages/integrations/azure-devops/src/types.ts`.
- [x] **II. Functional Programming** - Parsing work item IDs, extracting child links, parsing pull request artifact references, deduplication, filtering, sorting, and stage selection can be implemented as pure functions; Azure DevOps calls remain isolated to the client and integration boundary.
- [x] **III. Test-First** - Plan requires failing tests first for staged responses, child traversal, PR deduplication, hash extraction, filter application, sort behavior, and MCP tool registration/handler behavior before implementation begins.
- [x] **IV. UX Consistency** - N/A for visual UI surfaces; the interaction contract is a structured MCP text payload that guides conversational follow-up by returning filter facets, supported sort fields, and candidate totals before finalization.
- [x] **V. Performance by Design** - Web budgets are N/A, but server-side performance is designed around batch work-item reads, deduplicated pull-request hydration, in-memory refinement after hydration, and explicit candidate/final totals so the agent does not need redundant re-fetches to ask follow-up questions.

## Project Structure

### Documentation (this feature)

```text
specs/003-fetch-workitem-prs/
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
packages/
└── integrations/
    └── azure-devops/
        └── src/
            ├── client.ts
            ├── index.ts
            ├── pull-requests.ts
            ├── types.ts
            ├── work-items.ts
            └── __tests__/
                ├── pull-requests.test.ts
                └── work-items.test.ts

apps/
└── az-mcp/
    └── src/
        ├── server.ts
        ├── tools/
        │   └── get-work-item-pull-requests.ts
        └── __tests__/
            ├── server.test.ts
            └── tools/
                └── get-work-item-pull-requests.test.ts
```

**Structure Decision**: Keep the feature inside the existing Azure DevOps integration package and MCP server. The shared package owns work-item child discovery, pull-request artifact parsing, Git API hydration, hash extraction, filtering, sorting, and staged-response shaping. The app package owns MCP schema registration and JSON serialization for the new tool.

## Complexity Tracking

> No constitution violations. The design stays within the current package boundaries and introduces one new integration module for pull-request-specific behavior.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
