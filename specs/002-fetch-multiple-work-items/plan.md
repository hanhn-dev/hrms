# Implementation Plan: Multiple Work Item Retrieval

**Branch**: `002-fetch-multiple-work-items` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-fetch-multiple-work-items/spec.md`

## Summary

Add efficient multi-item retrieval to the Azure DevOps MCP server by introducing a batch-capable work item fetch path that accepts comma-separated IDs, preserves request order, reports per-item issues, and keeps existing single-item retrieval intact. Performance is protected by parsing and validating IDs locally, deduplicating valid IDs before transport, retrieving valid items through a single Azure DevOps batch call for up to 25 IDs, and using targeted follow-up lookups only for IDs omitted from the batch response.

## Technical Context

**Language/Version**: TypeScript 6.x, strict mode, Node.js 20.19+ or 22.12+  
**Primary Dependencies**: `@modelcontextprotocol/sdk`, `azure-devops-node-api`, `zod`, `turndown`  
**Storage**: N/A - stateless; all data fetched live from Azure DevOps APIs  
**Testing**: Vitest unit and integration tests in `packages/integrations/azure-devops` and `apps/az-mcp`  
**Target Platform**: Node.js MCP server over `stdio`, launched by MCP clients such as VS Code Copilot Agent  
**Project Type**: Existing MCP server app (`apps/az-mcp`) plus shared integration package (`packages/integrations/azure-devops`)  
**Performance Goals**: Existing single-item retrieval remains <= 3 s; multi-item retrieval for up to 25 valid IDs completes <= 5 s under normal network conditions; mixed-result requests avoid N-per-ID full fetch latency  
**Constraints**: Read-only behavior only; preserve current single-item tool compatibility; support comma-separated IDs with optional whitespace; enforce a hard batch limit of 25 IDs per request; preserve input order; classify invalid, missing, and inaccessible entries individually; avoid avoidable attachment metadata round-trips during batch retrieval  
**Scale/Scope**: One incremental enhancement to the existing Azure DevOps integration and MCP server; maximum guaranteed batch size is 25 IDs per request

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** - All expected implementation files are `.ts`; existing packages use `strict: true`; plan keeps shared shapes in `packages/integrations/azure-devops/src/types.ts`; public helpers and MCP handlers will retain explicit return types.
- [x] **II. Functional Programming** - Parsing, validation, deduplication, result reconstruction, and per-item classification can be implemented as pure functions; Azure DevOps calls remain isolated to the client/integration boundary.
- [x] **III. Test-First** - Plan requires failing tests first for parsing, ordering, mixed-result handling, batch API usage, and MCP tool behavior before implementation begins.
- [x] **IV. UX Consistency** - N/A: no visual UI surface is introduced. MCP tool responses remain structured JSON text consumed by AI agents.
- [x] **V. Performance by Design** - Web performance budgets are N/A, but server-side performance is explicitly designed: one batch Azure call for valid IDs, deduplicated transport, bounded fallback classification calls, and attachment metadata reuse before extra fetches.

## Project Structure

### Documentation (this feature)

```text
specs/002-fetch-multiple-work-items/
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
            ├── types.ts
            ├── work-items.ts
            └── __tests__/
                └── work-items.test.ts

apps/
└── az-mcp/
    └── src/
        ├── server.ts
        └── __tests__/
            └── server.test.ts
```

**Structure Decision**: Keep the change inside the existing integration package and MCP server rather than adding a new package. The integration package owns parsing support types, batch retrieval orchestration, and Azure DevOps interaction. The MCP server owns the public MCP contract and compatibility behavior for single-item versus multi-item retrieval.

## Complexity Tracking

> No constitution violations. The design stays within the current package boundaries and adds one incremental capability.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
