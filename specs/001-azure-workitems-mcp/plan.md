# Implementation Plan: Azure Work Items MCP Server

**Branch**: `001-azure-workitems-mcp` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-azure-workitems-mcp/spec.md`

## Summary

Build a read-only MCP (Model Context Protocol) server that exposes Azure DevOps work items to AI agents via `stdio` transport. The server wraps `azure-devops-node-api` in a typed `@hrms/azure-devops` integration package and serves three MCP tools (`az_get_work_item`, `az_list_work_items`, `az_query_work_items`) plus an `azdo://workitem/{id}` resource. HTML fields (Description, Acceptance Criteria) are converted to Markdown via `turndown` before delivery to agents.

## Technical Context

**Language/Version**: TypeScript 6.x, strict mode, Node.js 20.19+ or 22.12+  
**Primary Dependencies**: `@modelcontextprotocol/sdk`, `azure-devops-node-api`, `turndown`, `zod`  
**Storage**: None — stateless; all data fetched live from Azure DevOps REST API  
**Testing**: Vitest (unit + integration); no Playwright needed (no UI surface)  
**Target Platform**: Node.js 20.19+ or 22.12+ for local development and test runs; spawned as a child process by MCP clients (VS Code Copilot Agent, Claude Desktop, Cursor)  
**Project Type**: MCP Server application (`apps/az-mcp`) + integration library (`packages/integrations/azure-devops`)  
**Performance Goals**: Single work item ≤ 3 s; batch of 200 items ≤ 10 s  
**Constraints**: Read-only v1; no secrets in code; PAT via env vars validated with Zod at startup; HTML converted to Markdown before AI delivery  
**Scale/Scope**: Single developer / small team; up to 200 work items per query

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** — All new files are `.ts`; `strict: true` in both `tsconfig.json`s; no `any`; all public function signatures carry explicit return types.
- [x] **II. Functional Programming** — Business logic (`work-items.ts`, `html-to-text.ts`, `config.ts`) is pure functions only; `AzureDevOpsClient` isolates all I/O; no shared mutable state; no React (N/A — this is a server).
- [x] **III. Test-First** — Failing Vitest tests written before implementation; unit ≥ 80% coverage for `@hrms/azure-devops`; each tool handler has a happy-path + error-path test; P1 user story covered by integration test with mocked `azure-devops-node-api`.
- [x] **IV. UX Consistency** — N/A: no UI surface. MCP server outputs JSON/Markdown text consumed by AI agents; design system principles do not apply.
- [x] **V. Performance by Design** — N/A: no web pages or bundles. Server-side latency targets documented in Technical Context (≤ 3 s / ≤ 10 s).

## Project Structure

### Documentation (this feature)

```text
specs/001-azure-workitems-mcp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── mcp-tools.md     # MCP tool & resource contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
└── integrations/
    └── azure-devops/             # @hrms/azure-devops
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts          # Public exports
            ├── types.ts          # WorkItem, WorkItemSummary, AzureDevOpsConfig, ListWorkItemsFilter
            ├── config.ts         # loadConfig() — Zod env-var validation
            ├── html-to-text.ts   # htmlToMarkdown() — turndown wrapper
            ├── client.ts         # AzureDevOpsClient — wraps WebApi, owns all I/O
            ├── work-items.ts     # getWorkItem(), listWorkItems(), queryWorkItems()
            └── __tests__/
                ├── html-to-text.test.ts
                ├── work-items.test.ts
                └── config.test.ts

apps/
└── az-mcp/                       # private, not published
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              # Entry: loadConfig → createServer → StdioServerTransport → connect
        ├── server.ts             # Constructs MCP Server, registers all tools + resources
        ├── config.ts             # App-level config (delegates to @hrms/azure-devops loadConfig)
        ├── tools/
        │   ├── get-work-item.ts
        │   ├── list-work-items.ts
        │   └── query-work-items.ts
        ├── resources/
        │   └── work-item-resource.ts
        └── __tests__/
            ├── tools/
            │   ├── get-work-item.test.ts
            │   ├── list-work-items.test.ts
            │   └── query-work-items.test.ts
            └── resources/
                └── work-item-resource.test.ts
```

**Root `package.json` workspace update required:**
```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "packages/integrations/*"
  ]
}
```
Needed because `packages/integrations/azure-devops` is nested one level deeper than the current `packages/*` glob.

**Structure Decision**: Two-package design. `packages/integrations/azure-devops` is an independently testable, reusable Azure DevOps client library. Future integrations (e.g., `packages/integrations/aws`) follow the same pattern. `apps/az-mcp` wires the library to the MCP protocol.

## Complexity Tracking

> No constitution violations. All principles satisfied or N/A for a server-only feature.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Two packages instead of one | `@hrms/azure-devops` must be independently testable and reusable by future apps. User explicitly requested the `integrations/` grouping for extensibility (e.g., future `aws` integration). | Merging everything into `apps/az-mcp` would couple the Azure DevOps client to the MCP protocol, making it untestable in isolation and preventing reuse. |
