# Data Model: Database MCP App

**Phase**: 1 — Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## Entities

### DatabaseMcpConfig

Runtime configuration loaded from environment variables before the MCP server connects its stdio transport.

| Field | TypeScript Type | Source | Notes |
|-------|-----------------|--------|-------|
| `engine` | `"sqlserver" | "mysql" | "postgres" | "oracle" | "sqlite"` | `DB_MCP_ENGINE` | Required; matches the engine set ported from `db-inspector` |
| `connectionString` | `string \| undefined` | `DB_MCP_CONNECTION_STRING` | Optional shortcut for DSN-based connection setup |
| `host` | `string \| undefined` | `DB_MCP_HOST` | Required for network engines when no connection string is supplied |
| `port` | `number \| undefined` | `DB_MCP_PORT` | Optional or engine-specific default |
| `database` | `string \| undefined` | `DB_MCP_DATABASE` | Required for network engines when applicable |
| `user` | `string \| undefined` | `DB_MCP_USER` | Required for authenticated network engines unless connection string handles it |
| `password` | `string \| undefined` | `DB_MCP_PASSWORD` | Secret; never logged |
| `schema` | `string \| undefined` | `DB_MCP_SCHEMA` | Optional default schema or owner |
| `ssl` | `boolean` | `DB_MCP_SSL` | Normalized from env string |
| `trustServerCertificate` | `boolean` | `DB_MCP_TRUST_SERVER_CERTIFICATE` | SQL Server compatibility flag |
| `sqlitePath` | `string \| undefined` | `DB_MCP_SQLITE_PATH` | Required for SQLite when no connection string is supplied |

---

### DatabaseCatalog

Top-level catalog snapshot returned by `db_get_catalog`.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `engine` | `DatabaseMcpConfig["engine"]` | Identifies the active engine |
| `schemas` | `readonly string[]` | Unique schema names discovered from the target database |
| `objects` | `readonly DatabaseObjectSummary[]` | Flattened catalog objects such as tables, views, functions, and stored procedures |
| `relationships` | `readonly DatabaseRelationship[]` | Foreign-key and dependency edges when available |
| `warnings` | `readonly string[]` | Partial-support or metadata warnings that the agent should see |

---

### DatabaseObjectSummary

A lightweight descriptor for one database object discovered in the catalog.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `id` | `string` | Stable schema-qualified identifier |
| `schema` | `string` | Owning schema |
| `name` | `string` | Object name |
| `kind` | `"table" | "view" | "storedProcedure" | "trigger" | "function" | "sequence"` | Matches the reference object model |
| `definitionAvailable` | `boolean` | Indicates whether definition text can be fetched |
| `dependencySupport` | `"full" | "partial" | "none"` | Makes engine limitations explicit |

---

### DatabaseObjectDetails

Detailed metadata for one schema-qualified object, returned by `db_get_object_details` and reused by stored-procedure-specific tools.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `object` | `DatabaseObjectSummary` | The target object |
| `columns` | `readonly DatabaseColumn[]` | Populated for tables and views |
| `parameters` | `readonly RoutineParameter[]` | Populated for functions and stored procedures when available |
| `definition` | `string \| null` | SQL definition text or `null` |
| `definitionUnavailableReason` | `string \| null` | Explains why `definition` is unavailable |
| `dependencies` | `readonly DependencySummary[]` | Objects directly referenced by the target object |
| `dependents` | `readonly DependencySummary[]` | Objects that reference the target object when the engine can resolve them |
| `relationships` | `readonly DatabaseRelationship[]` | Object-local relationship subset |
| `warnings` | `readonly string[]` | Partial-resolution warnings |

---

### CreateTableRequest

Structured mutation input for `db_create_table`.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `schema` | `string \| undefined` | Defaults to `DatabaseMcpConfig.schema` or engine default |
| `name` | `string` | New table name |
| `columns` | `readonly CreateTableColumn[]` | At least one column is required |
| `primaryKey` | `readonly string[] \| undefined` | Optional primary-key column names |
| `ifNotExists` | `boolean` | Optional guard when the engine supports it |

---

### AlterTableRequest

Structured mutation input for `db_alter_table`.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `schema` | `string \| undefined` | Target schema |
| `name` | `string` | Existing table name |
| `renameTo` | `string \| undefined` | Optional table rename |
| `addColumns` | `readonly CreateTableColumn[]` | Optional column additions |
| `alterColumns` | `readonly AlterColumnPatch[]` | Optional column changes |
| `dropColumns` | `readonly string[]` | Optional dropped-column names |
| `addConstraints` | `readonly TableConstraintRequest[]` | Optional new constraints |
| `dropConstraints` | `readonly string[]` | Optional removed constraints |

---

### RelationshipMutationRequest

Structured input for `db_add_relationship`.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `fromSchema` | `string \| undefined` | Source table schema |
| `fromTable` | `string` | Source table |
| `fromColumn` | `string` | Source column |
| `toSchema` | `string \| undefined` | Target table schema |
| `toTable` | `string` | Target table |
| `toColumn` | `string` | Target column |
| `constraintName` | `string \| undefined` | Optional explicit FK name |
| `onDelete` | `"cascade" | "setNull" | "restrict" | "noAction" | undefined` | Optional action |
| `onUpdate` | `"cascade" | "setNull" | "restrict" | "noAction" | undefined` | Optional action |

---

### StoredProcedureInsight

Specialized response for stored procedure tools.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `schema` | `string` | Procedure schema |
| `name` | `string` | Procedure name |
| `script` | `string \| null` | Current definition text |
| `scriptUnavailableReason` | `string \| null` | Explanation when the script cannot be returned |
| `dependencies` | `readonly DependencySummary[]` | Direct referenced objects |
| `dependents` | `readonly DependencySummary[]` | Reverse references when supported |
| `warnings` | `readonly string[]` | Partial-support warnings |

---

### OperationResult

Standard result wrapper for every inspection or mutation tool.

| Field | TypeScript Type | Notes |
|-------|-----------------|-------|
| `ok` | `boolean` | Success flag |
| `operation` | `string` | Canonical tool operation name |
| `engine` | `DatabaseMcpConfig["engine"]` | Active engine |
| `affectedObjects` | `readonly string[]` | Schema-qualified object identifiers |
| `sql` | `readonly string[]` | SQL statements executed or proposed |
| `message` | `string` | Human-readable summary |
| `warnings` | `readonly string[]` | Non-fatal issues |
| `error` | `string \| null` | Populated when `ok` is `false` |

## State Transitions

Mutation requests follow a single-request lifecycle:

1. `received` — MCP tool input has been parsed.
2. `validated` — engine-specific identifiers and required fields are confirmed.
3. `planned` — SQL statements and affected objects are derived.
4. `executed` — statements run against the target database.
5. `reported` — a structured `OperationResult` is returned.

If validation or execution fails, the request transitions directly to `reported` with `ok = false` and a populated `error`.

## Validation Rules

| Rule | Description |
|------|-------------|
| Engine is required and must match the supported enum | Enforced by Zod in startup config |
| SQLite requires `DB_MCP_SQLITE_PATH` when no connection string is present | Prevents ambiguous local database selection |
| Network engines require either a connection string or the minimum host/database/user configuration | Avoids half-configured startup states |
| Table and column names must be non-empty and valid for the target engine's identifier rules | Reuses validation concepts from the reference schema-designer logic |
| Relationship requests must reference compatible source and target columns | Validated before SQL generation |
| Alter-table requests must contain at least one change operation | Prevents no-op mutation calls |
| Stored procedure responses must distinguish unavailable definitions from missing procedures | Prevents false negatives in agent reasoning |

## External Mapping Notes

- `DatabaseCatalog`, `DatabaseObjectDetails`, and `StoredProcedureInsight` are shaped from the `db-inspector` `DatabaseModel`, `DbObjectMeta`, `DbRelationship`, and dependency contracts, but normalized for direct MCP tool output.
- `CreateTableRequest` and `RelationshipMutationRequest` reuse the engine-aware DDL strategy already present in the reference schema-designer logic.
- `AlterTableRequest` is new for `hrms`; it extends the reference model to support executable changes against existing tables.
