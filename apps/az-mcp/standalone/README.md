# Azure DevOps MCP server

Standalone handoff package. Recipients need Node.js 20.19+ (or 22.12+) and their own Azure DevOps PAT. Do not reuse someone else's token.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `AZURE_DEVOPS_ORG_URL` | Yes | Organization URL, e.g. `https://dev.azure.com/your-org` |
| `AZURE_DEVOPS_PROJECT` | Yes | Default project name |
| `AZURE_DEVOPS_TOKEN` | Yes | PAT with **Work Items (Read)** scope |

Smoke-check (the process waits on stdio; Ctrl+C to stop):

```bash
npm start
```

## Connect an MCP client

Use an **absolute** path to `dist/index.js`. Credentials can live in the client `env` block instead of `.env`.

Cursor / Claude Desktop:

```json
{
  "mcpServers": {
    "azure-workitems": {
      "command": "node",
      "args": ["/absolute/path/to/az-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://dev.azure.com/your-org",
        "AZURE_DEVOPS_PROJECT": "YourProjectName",
        "AZURE_DEVOPS_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

This server speaks stdio. The editor must spawn `node`; it does not open a port.

## Rebuild (maintainers)

From the monorepo root:

```bash
npm run build:standalone --workspace=apps/az-mcp
```

Then zip `apps/az-mcp/standalone/` (exclude `node_modules` and `.env`) or run:

```bash
npm run pack:standalone --workspace=apps/az-mcp
```

That writes `apps/az-mcp/standalone/az-mcp-0.0.1.tgz`. Recipients unpack it with `tar -xzf az-mcp-0.0.1.tgz` and work from the resulting `package/` folder.
