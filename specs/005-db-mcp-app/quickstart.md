# Quickstart: Database MCP App

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## Prerequisites

- Node.js 22.18+ for local build workflows that run `tsdown`
- The bundled `apps/db-mcp/dist/index.js` artifact remains compatible with Node.js 22.12+ for the validated SQLite runtime workflow and with Node.js 20.19+ or 22.12+ for config parsing and future network-engine support
- npm 10+
- Access to a supported relational database with inspection permissions
- Additional DDL permissions if you want to create tables, alter tables, or add relationships

## 1. Install dependencies

From the repo root:

```bash
npm install
```

## 2. Configure environment variables

Create a `.env` file in `apps/db-mcp/` and keep it out of source control.

### Example: SQL Server

```env
DB_MCP_ENGINE=sqlserver
DB_MCP_HOST=localhost
DB_MCP_PORT=1433
DB_MCP_DATABASE=SampleDb
DB_MCP_USER=sa
DB_MCP_PASSWORD=your-password
DB_MCP_SCHEMA=dbo
DB_MCP_SSL=false
DB_MCP_TRUST_SERVER_CERTIFICATE=true
```

### Example: SQLite

```env
DB_MCP_ENGINE=sqlite
DB_MCP_SQLITE_PATH=./fixtures/sample.sqlite
```

### Supported variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_MCP_ENGINE` | Yes | Target engine: `sqlserver`, `mysql`, `postgres`, `oracle`, or `sqlite` |
| `DB_MCP_CONNECTION_STRING` | No | Optional single-string connection override |
| `DB_MCP_HOST` | Conditional | Host for network databases |
| `DB_MCP_PORT` | No | Port for network databases |
| `DB_MCP_DATABASE` | Conditional | Database or service name |
| `DB_MCP_USER` | Conditional | Database username |
| `DB_MCP_PASSWORD` | Conditional | Database password |
| `DB_MCP_SCHEMA` | No | Default schema or owner |
| `DB_MCP_SSL` | No | Enables SSL when `true` |
| `DB_MCP_TRUST_SERVER_CERTIFICATE` | No | SQL Server compatibility option |
| `DB_MCP_SQLITE_PATH` | Conditional | SQLite file path when using `sqlite` |

## 3. Build the MCP app

```bash
npm run build --workspace=apps/db-mcp
```

The bundled app build resolves the shared database-inspector workspace code into `apps/db-mcp/dist/index.js` while leaving runtime-sensitive database drivers external.

## 4. Connect the MCP server in VS Code

Add the built server to your MCP settings:

```json
{
  "servers": {
    "db-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["apps/db-mcp/dist/index.js"],
      "env": {
        "DB_MCP_ENGINE": "${env:DB_MCP_ENGINE}",
        "DB_MCP_CONNECTION_STRING": "${env:DB_MCP_CONNECTION_STRING}",
        "DB_MCP_HOST": "${env:DB_MCP_HOST}",
        "DB_MCP_PORT": "${env:DB_MCP_PORT}",
        "DB_MCP_DATABASE": "${env:DB_MCP_DATABASE}",
        "DB_MCP_USER": "${env:DB_MCP_USER}",
        "DB_MCP_PASSWORD": "${env:DB_MCP_PASSWORD}",
        "DB_MCP_SCHEMA": "${env:DB_MCP_SCHEMA}",
        "DB_MCP_SSL": "${env:DB_MCP_SSL}",
        "DB_MCP_TRUST_SERVER_CERTIFICATE": "${env:DB_MCP_TRUST_SERVER_CERTIFICATE}",
        "DB_MCP_SQLITE_PATH": "${env:DB_MCP_SQLITE_PATH}"
      }
    }
  }
}
```

## 5. Example agent usage

Once connected, an AI agent can ask the server to:

- "Get the current database catalog and summarize the tables."
- "Show the stored procedure dependency response for `main.sync_users` and explain any warnings."
- "Create a new table called `audit_log` with an integer primary key and a timestamp column."
- "Add a relationship from `orders.customer_id` to `customers.id`."
- "Alter the `orders` table to add a nullable `external_reference` column."

## Current validated support

- SQLite: catalog, object details, create table, alter table, add relationship, and the end-to-end test workflow
- SQLite stored procedure tools: explicit unsupported responses with warnings
- SQL Server, PostgreSQL, MySQL, and Oracle: read-only catalog, object detail, and stored procedure adapter paths are implemented and wired into the shared services
- Network engines are not yet covered by the same end-to-end validation depth as the SQLite workflow in this repo

## 6. Run focused tests

```bash
npm run test --workspace=packages/integrations/database-inspector
npm run test --workspace=apps/db-mcp
```

For opt-in runtime validation of the Postgres read-only adapter against a live database:

```bash
set DB_MCP_POSTGRES_TEST_CONNECTION_STRING=postgres://user:password@localhost:5432/sample_db
npm run test:integration:postgres --workspace=packages/integrations/database-inspector
```

The Postgres integration test creates and drops its own temporary schema, so point it at a writable test database rather than a shared production-like environment.

If you are running the SQLite-backed end-to-end scenario, use Node 22.12+ so the runtime matches the reference engine implementation.

## Package Structure Summary

```text
packages/integrations/database-inspector/
  src/
    config.ts            env parsing and validation
    types.ts             shared config, catalog, mutation, and result types
    catalog.ts           catalog discovery and model normalization
    object-details.ts    schema-qualified object detail lookup
    procedures.ts        stored procedure script and dependency shaping
    mutations/
      create-table.ts    create-table SQL planning and execution
      alter-table.ts     alter-table SQL planning and execution
      add-relationship.ts relationship SQL planning and execution
    engines/             engine-specific adapters ported from db-inspector

apps/db-mcp/
  src/
    index.ts             startup: load config -> create server -> stdio transport
    server.ts            MCP server construction and tool registration
    tools/               thin handlers delegating to the shared package
```
