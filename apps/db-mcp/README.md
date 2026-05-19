# db-mcp

`db-mcp` is a stdio MCP server for database inspection and schema changes.

## Current status

- SQLite is the validated engine for catalog inspection, object details, create-table, alter-table, and add-relationship flows.
- Stored procedure tools are registered and return explicit unsupported responses for SQLite.
- SQL Server, PostgreSQL, MySQL, and Oracle are wired for read-only catalog, object detail, and stored procedure inspection paths.
- Network-engine read-only adapters currently build and are connected through the shared services, but SQLite remains the only engine validated end to end in this repo.

## Commands

From the repo root:

```bash
npm run build --workspace=packages/integrations/database-inspector
npm run build --workspace=apps/db-mcp
npm run test --workspace=packages/integrations/database-inspector
npm run test:integration:postgres --workspace=packages/integrations/database-inspector
npm run test --workspace=apps/db-mcp
```

To run the live Postgres adapter check, set `DB_MCP_POSTGRES_TEST_CONNECTION_STRING` to a writable test database before invoking `test:integration:postgres`. The test creates and drops an isolated schema automatically.

From `apps/db-mcp`:

```bash
npm run start
npm run inspect
```

## Environment

Copy `apps/db-mcp/.env.example` to `.env` and provide the `DB_MCP_*` variables for your target database.

For SQLite on Node 22.12+:

```env
DB_MCP_ENGINE=sqlite
DB_MCP_SQLITE_PATH=./fixtures/sample.sqlite
```

## Tool surface

- `db_get_catalog`
- `db_get_object_details`
- `db_create_table`
- `db_alter_table`
- `db_add_relationship`
- `db_get_stored_procedure_script`
- `db_get_stored_procedure_dependencies`

Tool responses are JSON payloads in `content[0].text`. Successful mutation tools return `OperationResult`; unsupported and rejected requests are also normalized into the same JSON envelope.