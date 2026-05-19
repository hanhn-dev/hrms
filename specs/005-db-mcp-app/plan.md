# Implementation Plan: Database MCP App

**Branch**: `[005-add-db-mcp-app]` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-db-mcp-app/spec.md`

## Summary

Build a new `apps/db-mcp` stdio MCP server in `hrms` and a shared `packages/integrations/database-inspector` library by porting the Node-safe database inspection logic from `db-inspector` rather than copying its app shells. The implementation will reuse the proven engine adapters and contract shapes from `db-inspector` for catalog inspection and stored procedure detail lookup, reuse the schema-designer SQL generation logic for create-table and relationship creation flows, and add a new explicit alter-table mutation layer so AI agents can inspect and manipulate supported databases through a focused `db_` tool catalog configured entirely from environment variables.

## Technical Context

**Language/Version**: TypeScript 6.x with strict mode on Node.js 20.19+ or 22.12+  
**Primary Dependencies**: `@modelcontextprotocol/sdk@1.29.0`, `zod@4.4.3`, `mssql@12.5.x`, `mysql2@3.22.x`, `pg@8.20.x`, `oracledb@6.10.x`; SQLite support ports `node:sqlite` behavior from `db-inspector` when running on Node 22.12+  
**Storage**: Target relational databases only (SQL Server, MySQL, PostgreSQL, Oracle, SQLite); no app-owned persistence in v1 outside test fixtures  
**Testing**: Vitest 4.1 unit and MCP contract tests, in-memory MCP client/server tests, engine adapter tests, and at least one end-to-end P1 scenario against a SQLite fixture on Node 22.12+  
**Target Platform**: Cross-platform stdio MCP server consumed by VS Code Copilot Agent or Claude Desktop  
**Project Type**: Monorepo server app plus reusable integration package  
**Performance Goals**: Startup config validation fails fast before transport connect; valid catalog and stored-procedure inspection requests complete within 10 seconds on catalogs up to 1,000 objects; every mutation request returns a structured result in the originating MCP round-trip  
**Constraints**: Connection details come only from environment variables; secrets must never be committed or echoed in logs; public tools stay explicit and task-oriented rather than exposing a generic arbitrary-SQL mutation tool; engine-specific metadata gaps must return structured unsupported or partial results; SQLite execution support depends on Node 22.12+ because the reference implementation uses `node:sqlite`  
**Scale/Scope**: One new MCP app, one new shared integration package, five supported engines reused from `db-inspector` where feasible, seven MCP tools for inspection and mutation, and focused tests plus contracts/docs for the new server surface

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** — The feature is planned as TypeScript-only in `apps/db-mcp` and `packages/integrations/database-inspector`; env parsing, tool handlers, engine services, and exported types stay explicitly typed with no JavaScript source or `any`-based public APIs.
- [x] **II. Functional Programming** — Business logic is isolated in pure builder and mapper functions that transform env config, database metadata, and mutation requests; side effects stay at the engine execution and MCP transport boundaries.
- [x] **III. Test-First** — The plan requires failing tests before implementation for env validation, MCP tool registration and invocation, DDL generation, and at least one end-to-end P1 workflow through the MCP server.
- [x] **IV. UX Consistency** — No UI surface is introduced; consistency is enforced through one documented `db_` tool catalog, structured error envelopes, and predictable result payloads for AI clients.
- [x] **V. Performance by Design** — The feature is server-only, so browser budget gates are N/A; the design preserves prompt-time responsiveness by reusing the reference engine queries, avoiding unnecessary local persistence, and keeping request scope explicit per tool.

## Project Structure

### Documentation (this feature)

```text
specs/005-db-mcp-app/
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
  └── database-inspector/
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    └── src/
      ├── index.ts
      ├── config.ts
      ├── types.ts
      ├── catalog.ts
      ├── object-details.ts
      ├── procedures.ts
      ├── mutations/
      │   ├── create-table.ts
      │   ├── alter-table.ts
      │   └── add-relationship.ts
      ├── engines/
      │   ├── mysql.ts
      │   ├── oracle.ts
      │   ├── postgres.ts
      │   ├── shared.ts
      │   ├── sqlite.ts
      │   ├── sqlserver.ts
      │   └── types.ts
      └── __tests__/
        ├── config.test.ts
        ├── catalog.test.ts
        ├── procedures.test.ts
        └── mutations/
          ├── create-table.test.ts
          ├── alter-table.test.ts
          └── add-relationship.test.ts

apps/
└── db-mcp/
  ├── package.json
  ├── tsconfig.json
  ├── vitest.config.ts
  ├── .env.example
  └── src/
    ├── index.ts
    ├── config.ts
    ├── server.ts
    ├── tool-types.ts
    ├── tools/
    │   ├── get-catalog.ts
    │   ├── get-object-details.ts
    │   ├── create-table.ts
    │   ├── alter-table.ts
    │   ├── add-relationship.ts
    │   ├── get-stored-procedure-script.ts
    │   └── get-stored-procedure-dependencies.ts
    └── __tests__/
      ├── server.test.ts
      └── tools/
        ├── get-catalog.test.ts
        ├── get-object-details.test.ts
        ├── create-table.test.ts
        ├── alter-table.test.ts
        ├── add-relationship.test.ts
        ├── get-stored-procedure-script.test.ts
        └── get-stored-procedure-dependencies.test.ts
```

**Structure Decision**: Follow the successful `hrms/apps/az-mcp` pattern for a thin MCP shell, but move all reusable database behavior into `packages/integrations/database-inspector`. Port only the Node-safe reference logic from `db-inspector/packages/contracts`, `db-inspector/packages/connection-host`, and `db-inspector/packages/core/features/schema-designer`; do not copy the `db-inspector` app shells, UI packages, cache layer, or host-bridge transport.

## Complexity Tracking

> No constitution violations. The feature adds one reusable integration package because the app shell should stay thin and the ported database behavior must remain testable outside the MCP transport.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
