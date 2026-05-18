# Quickstart: Azure Work Items MCP Server

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-14

---

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm ≥ 10
- An Azure DevOps organization with at least one project
- A Personal Access Token (PAT) with **Work Items (Read)** scope

---

## 1. Install dependencies

From the repo root:

```bash
npm install
```

The workspace will resolve `@hrms/azure-devops` and `apps/az-mcp` automatically.

---

## 2. Configure environment variables

Create a `.env` file in `apps/az-mcp/` (never commit this file):

```env
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org
AZURE_DEVOPS_PROJECT=YourProjectName
AZURE_DEVOPS_TOKEN=your-personal-access-token
```

| Variable               | Required | Description                                        |
|-----------------------|----------|----------------------------------------------------|
| `AZURE_DEVOPS_ORG_URL` | Yes      | Your Azure DevOps organization URL                 |
| `AZURE_DEVOPS_PROJECT` | Yes      | Default project name (used when not specified in tool calls) |
| `AZURE_DEVOPS_TOKEN`   | Yes      | PAT with **Work Items (Read)** scope               |

---

## 3. Build

```bash
npm run build --workspace=apps/az-mcp
```

---

## 4. Connect to VS Code Copilot Agent

Add the following to your VS Code MCP settings (`.vscode/mcp.json` or user settings):

```json
{
  "servers": {
    "azure-workitems": {
      "type": "stdio",
      "command": "node",
      "args": ["apps/az-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "${env:AZURE_DEVOPS_ORG_URL}",
        "AZURE_DEVOPS_PROJECT": "${env:AZURE_DEVOPS_PROJECT}",
        "AZURE_DEVOPS_TOKEN": "${env:AZURE_DEVOPS_TOKEN}"
      }
    }
  }
}
```

---

## 5. Connect to Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "azure-workitems": {
      "command": "node",
      "args": ["/absolute/path/to/hrms/apps/az-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://dev.azure.com/your-org",
        "AZURE_DEVOPS_PROJECT": "YourProjectName",
        "AZURE_DEVOPS_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

---

## 6. Example AI agent usage

Once connected, an AI agent can:

**Get a specific work item:**
> "Get work item 1234 and summarise the acceptance criteria"

**List active user stories in a sprint:**
> "List all active User Stories in iteration 'Sprint 3' of project MyProject"

**Run a WIQL query:**
> "Query work items: SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'"

**Generate tests from a story:**
> "Fetch work item 1234, then write Vitest unit tests that cover the acceptance criteria"

---

## 7. Run tests

```bash
# Unit tests for the @hrms/azure-devops package
npm run test --workspace=packages/integrations/azure-devops

# Unit tests for the MCP server
npm run test --workspace=apps/az-mcp
```

---

## Package structure summary

```
packages/integrations/azure-devops/   → @hrms/azure-devops
  src/
    types.ts           WorkItem, WorkItemSummary, AzureDevOpsConfig interfaces
    config.ts          Zod env-var validation → AzureDevOpsConfig
    html-to-text.ts    htmlToMarkdown() using turndown
    client.ts          AzureDevOpsClient (wraps azure-devops-node-api WebApi)
    work-items.ts      getWorkItem(), listWorkItems(), queryWorkItems() pure functions
    index.ts           Public exports

apps/az-mcp/
  src/
    index.ts           Startup: loadConfig() → createServer() → StdioServerTransport
    server.ts          Server construction, tool + resource registration
    tools/
      get-work-item.ts
      list-work-items.ts
      query-work-items.ts
    resources/
      work-item-resource.ts
    config.ts          App-level config (delegates to @hrms/azure-devops config)
```
