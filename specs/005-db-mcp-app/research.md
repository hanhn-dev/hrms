# Research: Database MCP App

**Phase**: 0 — Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## 1. Port Boundary From `db-inspector`

### Decision
Create a new shared package at `packages/integrations/database-inspector` and port only the Node-safe database logic from `db-inspector` into it. Keep `apps/db-mcp` as a thin stdio MCP shell that mirrors the existing `apps/az-mcp` startup pattern.

### Rationale
- `db-inspector` already separates database behavior into shared packages: `packages/contracts` owns database contract shapes, `packages/connection-host` owns engine adapters and metadata access, and `packages/core/features/schema-designer` owns reusable SQL generation for new schemas.
- The `db-inspector` app folders are transport and UI shells for Electron, VS Code, web, and API. Copying them into `hrms` would import unrelated bridge, UI, auth, and cache concerns.
- `hrms/apps/az-mcp` already shows the preferred local pattern: keep MCP protocol wiring in the app and move reusable domain behavior into a package.

### Alternatives considered
- **Copy the full `db-inspector` repo structure into `hrms`**: rejected because the user only needs MCP database access, not desktop, webview, or React UI shells.
- **Implement everything directly inside `apps/db-mcp`**: rejected because the ported engine logic, config parsing, contract types, and mutation builders need to be independently testable and reusable.

---

## 2. Runtime Configuration Strategy

### Decision
Use a Zod-validated environment schema with a `DB_MCP_` prefix and no interactive credential collection. The package will support both normalized field-based configuration and engine-specific overrides.

### Rationale
- The feature spec explicitly requires connection details to come from environment variables.
- `hrms` constitution requires typed startup validation for secrets and credentials.
- `db-inspector/apps/api/src/config/env.ts` provides a proven fail-fast pattern for environment parsing and aggregated validation errors.

### Planned env shape
- `DB_MCP_ENGINE`: `sqlserver | mysql | postgres | oracle | sqlite`
- `DB_MCP_CONNECTION_STRING`: optional shortcut for engines that support DSNs or URLs
- `DB_MCP_HOST`, `DB_MCP_PORT`, `DB_MCP_DATABASE`, `DB_MCP_USER`, `DB_MCP_PASSWORD`: standard networked-engine fields
- `DB_MCP_SCHEMA`: optional default schema override
- `DB_MCP_SSL`: optional boolean
- `DB_MCP_TRUST_SERVER_CERTIFICATE`: optional SQL Server compatibility flag
- `DB_MCP_SQLITE_PATH`: required for SQLite when no connection string is used

### Alternatives considered
- **Prompting the user for credentials at runtime**: rejected because the feature must be headless and configuration-driven.
- **A checked-in JSON config file**: rejected because it increases secret-handling risk and violates the constitution's environment-validation guidance.

---

## 3. MCP Tool Surface

### Decision
Expose a focused `db_`-prefixed tool catalog instead of a generic host-bridge envelope or a raw SQL mutation tool.

### Planned tool set
- `db_get_catalog`
- `db_get_object_details`
- `db_create_table`
- `db_alter_table`
- `db_add_relationship`
- `db_get_stored_procedure_script`
- `db_get_stored_procedure_dependencies`

### Rationale
- The requested outcomes are explicit: inspect schemas, create tables, add relationships, alter tables, and inspect stored procedure scripts and dependencies.
- `db-inspector` exposes a broad internal bridge contract because it must serve multiple UI surfaces. An MCP server benefits from narrower task-shaped tools that are easier for an AI agent to choose correctly.
- Explicit tools make it easier to validate inputs, constrain write operations, and return predictable structured results.

### Alternatives considered
- **Expose the full `db-inspector` host bridge as one generic tool**: rejected because it leaks transport details and forces AI agents to understand internal bridge envelopes.
- **Expose a `db_execute_sql` mutation tool**: rejected for v1 because it weakens validation and makes accidental destructive operations much easier.

---

## 4. Schema Mutation Strategy

### Decision
Reuse `db-inspector/packages/core/features/schema-designer/index.ts` for table-creation and relationship SQL generation, then add a new engine-aware alter-table builder layer in the shared `hrms` package for mutations against existing tables.

### Rationale
- The reference project already contains reusable, non-UI schema-designer logic with `buildDesignerSql`, validation helpers, and engine-aware data type mapping for new table and relationship DDL.
- That shared logic is sufficient to generate `CREATE TABLE` and foreign-key statements, but it does not provide an executable alter-existing-table API.
- The requested `alter table` capability therefore needs a new explicit mutation layer in `hrms`, built beside the ported designer logic instead of hidden inside MCP handlers.

### Alternatives considered
- **Generate all mutation SQL from scratch in the app**: rejected because it would duplicate engine-specific rules that `db-inspector` already codifies.
- **Limit v1 to create-table only**: rejected because the spec and user request both require altering existing tables.

---

## 5. Stored Procedure Insight Strategy

### Decision
Port the object-detail and routine metadata flow from `db-inspector/packages/connection-host` and normalize it into dedicated stored-procedure tool responses that include the script, direct dependencies, direct dependents when available, and a machine-readable unavailability reason when metadata cannot be retrieved.

### Rationale
- `db-inspector` already models routine definitions and dependencies through `DbObjectMeta`, `DependencySummary`, and `FetchObjectDetailsResult`.
- The feature requires enough stored procedure context for agents to inspect database behavior, so the new MCP contract should preserve those semantics without exposing the full internal bridge layer.
- Engine support is uneven. SQL Server currently exposes the richest reverse-dependency lookup, while other engines may provide only partial metadata. The contract must make that partiality explicit.

### Alternatives considered
- **Return only the raw stored procedure script**: rejected because the request explicitly includes dependencies.
- **Hide engine-specific gaps behind empty arrays**: rejected because the user needs to know whether dependencies are absent or simply unavailable.

---

## 6. SQLite Support And Test Strategy

### Decision
Keep SQLite in scope because it is part of the reference engine set, but document that execution support depends on Node 22.12+ due to the `node:sqlite` API used by `db-inspector`. Use SQLite as the first end-to-end test target for the MCP server.

### Rationale
- `db-inspector/packages/connection-host/engines/sqlite.ts` uses `DatabaseSync` from `node:sqlite`, which is only available in newer Node runtimes.
- `hrms` already supports Node 20.19+ or 22.12+, so the plan must acknowledge that SQLite is the engine with the stricter runtime floor.
- SQLite provides the cheapest deterministic fixture for P1 end-to-end coverage because it requires no external service container.

### Alternatives considered
- **Drop SQLite from the initial feature**: rejected because the spec assumes the same engine families as the reference project.
- **Swap to a different SQLite client immediately**: rejected in planning because the goal is to copy the reference logic with minimal behavioral drift unless implementation forces a change.
