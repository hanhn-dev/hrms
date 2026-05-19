# MCP Tool Contracts: Database MCP App

**Phase**: 1 — Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-19

This document defines the public MCP tool surface for the database MCP server. The tool catalog is intentionally explicit and task-oriented so AI agents can inspect and manipulate database structures without learning the internal transport contracts used by `db-inspector`.

## Current implementation notes

- SQLite is the only engine validated end to end for catalog inspection and schema mutation flows.
- Stored procedure tools are available now and return explicit unsupported payloads for SQLite.
- SQL Server, PostgreSQL, MySQL, and Oracle read-only adapter paths are implemented for catalog, object detail, and stored procedure inspection flows.
- Non-SQLite mutation flows are still out of scope for the current implementation, and network-engine runtime behavior is not yet covered by the same end-to-end validation depth as SQLite.

## Tools

### `db_get_catalog`

Returns the current database catalog summary for the configured connection.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | No | Optional schema filter |
| `kinds` | string[] | No | Optional object-kind filter |
| `includeRelationships` | boolean | No | Include relationship edges when available |

**Output**

`content[0].text` contains a JSON-serialized `DatabaseCatalog`.

```json
{
  "engine": "sqlserver",
  "schemas": ["dbo", "sales"],
  "objects": [
    { "id": "dbo.orders", "schema": "dbo", "name": "orders", "kind": "table", "definitionAvailable": false, "dependencySupport": "full" },
    { "id": "dbo.uspCreateOrder", "schema": "dbo", "name": "uspCreateOrder", "kind": "storedProcedure", "definitionAvailable": true, "dependencySupport": "full" }
  ],
  "relationships": [
    { "id": "fk_orders_customers", "from": { "objectId": "dbo.orders", "column": "customer_id" }, "to": { "objectId": "dbo.customers", "column": "id" }, "label": "orders.customer_id -> customers.id" }
  ],
  "warnings": []
}
```

---

### `db_get_object_details`

Returns detailed metadata for one schema-qualified object.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | Yes | Object schema |
| `name` | string | Yes | Object name |
| `kind` | string | Yes | Object kind |
| `includeDependents` | boolean | No | Include reverse dependencies when supported |

**Output**

`content[0].text` contains a JSON-serialized `DatabaseObjectDetails`.

---

### `db_create_table`

Creates a new table using a structured DDL request.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | No | Target schema |
| `name` | string | Yes | New table name |
| `columns` | object[] | Yes | Column definitions |
| `primaryKey` | string[] | No | Primary-key columns |
| `ifNotExists` | boolean | No | Optional create-if-missing guard |

**Output**

`content[0].text` contains a JSON-serialized `OperationResult`.

**Result guarantees**

- `ok = true` when the table is created successfully
- `sql` includes the executed `CREATE TABLE` statement and any follow-up constraints
- `affectedObjects` includes the created table identifier

---

### `db_alter_table`

Applies structured changes to an existing table.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | No | Target schema |
| `name` | string | Yes | Existing table name |
| `renameTo` | string | No | Optional table rename |
| `addColumns` | object[] | No | New columns to add |
| `alterColumns` | object[] | No | Column patches |
| `dropColumns` | string[] | No | Columns to drop |
| `addConstraints` | object[] | No | New constraints |
| `dropConstraints` | string[] | No | Constraints to remove |

**Output**

`content[0].text` contains a JSON-serialized `OperationResult`.

**Error behavior**

- Rejects no-op requests that contain no table changes
- Rejects unsupported engine-specific alterations with a structured error message
- Returns the planned SQL statements in `sql` when available even if execution fails after planning

---

### `db_add_relationship`

Creates a relationship, typically a foreign-key constraint, between two existing tables.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromSchema` | string | No | Source table schema |
| `fromTable` | string | Yes | Source table |
| `fromColumn` | string | Yes | Source column |
| `toSchema` | string | No | Target table schema |
| `toTable` | string | Yes | Target table |
| `toColumn` | string | Yes | Target column |
| `constraintName` | string | No | Optional explicit constraint name |
| `onDelete` | string | No | Delete action |
| `onUpdate` | string | No | Update action |

**Output**

`content[0].text` contains a JSON-serialized `OperationResult`.

---

### `db_get_stored_procedure_script`

Returns the definition of a stored procedure when the target engine exposes it.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | Yes | Procedure schema |
| `name` | string | Yes | Procedure name |

**Output**

`content[0].text` contains a JSON-serialized `StoredProcedureInsight` where `script` is populated and `dependencies` may be empty.

**Error behavior**

- Engines that cannot reveal the definition return `script = null` and `scriptUnavailableReason`
- Handler-level failures are normalized into the standard JSON rejection envelope

---

### `db_get_stored_procedure_dependencies`

Returns the direct dependencies and direct dependents for a stored procedure when the target engine can resolve them.

**Input schema**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | Yes | Procedure schema |
| `name` | string | Yes | Procedure name |
| `includeDependents` | boolean | No | Request reverse dependencies when supported |

**Output**

`content[0].text` contains a JSON-serialized `StoredProcedureInsight` where `dependencies` and `dependents` are the primary fields of interest.

For SQLite, this tool currently returns empty dependency arrays plus a warning explaining that stored procedures are unsupported.

## Output Envelope Convention

All tools return one JSON payload in `content[0].text`. Mutation tools and rejected requests use the same normalized result contract:

```json
{
  "ok": false,
  "operation": "db_alter_table",
  "engine": "postgres",
  "affectedObjects": ["public.orders"],
  "sql": ["ALTER TABLE \"public\".\"orders\" ADD COLUMN \"external_reference\" VARCHAR(64) NULL"],
  "message": "Unable to alter table.",
  "warnings": [],
  "error": "Column \"external_reference\" already exists on public.orders."
}
```

## Capability Declaration

The MCP server declares tool capability support only.

```json
{
  "capabilities": {
    "tools": {}
  }
}
```

No MCP resources are planned for v1 because the requested workflows are tool-driven and do not require separate resource attachment semantics.
