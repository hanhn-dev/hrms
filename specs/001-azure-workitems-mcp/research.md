# Research: Azure Work Items MCP Server

**Phase**: 0 — Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-14

## 1. MCP SDK for Node.js — Setup & stdio Transport

### Decision
Use `@modelcontextprotocol/sdk` (the official TypeScript MCP SDK) with `StdioServerTransport`.

### Rationale
- `@modelcontextprotocol/sdk` is the canonical MCP library maintained by Anthropic. It handles all protocol framing, capability negotiation, and JSON-RPC plumbing.
- `StdioServerTransport` is the idiomatic transport for locally-spawned MCP servers; it reads from `process.stdin` and writes to `process.stdout`, making the server work without network configuration.
- Both VS Code Copilot Agent and Claude Desktop invoke MCP servers this way by default.

### Key API patterns
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new Server(
  { name: "azure-workitems-mcp", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// Register a tool
server.tool("az_get_work_item", { id: z.number() }, async ({ id }) => ({
  content: [{ type: "text", text: JSON.stringify(workItem) }]
}));

// Connect
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Alternatives considered
- **HTTP/SSE transport** (`StreamableHTTPServerTransport`): deferred to v2; adds network complexity for no gain in a monorepo local-dev scenario.
- **Lower-level JSON-RPC**: rejected; SDK removes all boilerplate.

---

## 2. `azure-devops-node-api` — Work Item API

### Decision
Use `azure-devops-node-api` (Microsoft's official Node.js client) for all Azure DevOps REST API calls.

### Rationale
- Official library, maintained by Microsoft alongside the Azure DevOps service.
- Provides typed responses from `WorkItemTrackingApi`, avoiding manual HTTP + schema maintenance.
- Supports PAT auth out of the box via `getPersonalAccessTokenHandler`.

### Key API patterns

**Authentication & connection**
```typescript
import * as azdev from "azure-devops-node-api";

const authHandler = azdev.getPersonalAccessTokenHandler(pat);
const connection = new azdev.WebApi(orgUrl, authHandler);
const witApi = await connection.getWorkItemTrackingApi();
```

**Get single work item**
```typescript
const item = await witApi.getWorkItem(id, [
  "System.Title",
  "System.Description",
  "Microsoft.VSTS.Common.AcceptanceCriteria",
  "System.State",
  "System.WorkItemType",
  "System.Tags",
  "System.AssignedTo",
  "System.IterationPath",
  "System.AreaPath",
  "System.Parent",
]);
// item.fields["System.Title"] → string
```

**WIQL query**
```typescript
import { Wiql } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";

const query: Wiql = { query: "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = 'MyProject' AND [System.State] = 'Active'" };
const result = await witApi.queryByWiql(query, { project: "MyProject" });
// result.workItems → Array<{ id: number, url: string }>

// Fetch full detail for up to N IDs in batch
const ids = result.workItems!.slice(0, 200).map(wi => wi.id!);
const items = await witApi.getWorkItems(ids, fields);
```

**List by iteration / type / state** (constructed WIQL):
```typescript
const conditions: string[] = [`[System.TeamProject] = '${project}'`];
if (type)      conditions.push(`[System.WorkItemType] = '${type}'`);
if (state)     conditions.push(`[System.State] = '${state}'`);
if (iteration) conditions.push(`[System.IterationPath] UNDER '${iteration}'`);
const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.ChangedDate] DESC`;
```

### Acceptance Criteria field
The field name is `Microsoft.VSTS.Common.AcceptanceCriteria`. It contains **HTML**. Must be converted before returning to an AI agent.

### Alternatives considered
- Direct HTTP via `fetch`/`axios`: rejected; untyped, more maintenance.
- `@azure/arm-devops` SDK: wrong SDK — that is ARM management plane, not DevOps data plane.

---

## 3. HTML → Markdown Conversion

### Decision
Use `turndown` (npm: `turndown`, types: `@types/turndown`) to convert HTML work item fields to Markdown.

### Rationale
- Work item Description and Acceptance Criteria are stored as HTML in Azure DevOps.
- AI prompts consume Markdown much more cleanly than raw HTML.
- `turndown` is the de-facto standard HTML→Markdown converter for Node.js; actively maintained, zero heavy dependencies.
- Produces clean Markdown for the constructs Azure DevOps uses (headings, lists, bold, code, tables).

### Usage pattern
```typescript
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";
  return td.turndown(html).trim();
}
```

### Alternatives considered
- `html-to-text`: produces plain text, not Markdown — loses structure that aids AI comprehension.
- Manual regex stripping: fragile; cannot handle nested HTML reliably.

---

## 4. Turborepo Monorepo — Nested Package Workspace Setup

### Decision
Add `packages/integrations/*` to the root `package.json` workspaces array alongside the existing `packages/*`. The `packages/integrations/` directory is a simple container folder (no `package.json` of its own).

### Rationale
- The root workspace currently lists `"packages/*"` which resolves packages directly under `packages/`. It does NOT traverse deeper (e.g., `packages/integrations/azure-devops`).
- Adding `"packages/integrations/*"` to the `workspaces` array makes npm recognise `packages/integrations/azure-devops` as a workspace package without altering the existing resolution for other packages.
- This is the idiomatic pattern for workspace-organised monorepos (e.g., "categories" like `integrations/`, `adapters/`, `plugins/`).

### Change required to `package.json`
```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "packages/integrations/*"
  ]
}
```

### Alternatives considered
- Single flat `packages/azure-devops/` (no `integrations/` grouping): rejected per user's explicit requirement to support future integrations (e.g., `aws`).
- Making `packages/integrations/` itself a package with its own `package.json`: over-engineering; adds a pointless wrapper package that has no exports.

---

## 5. Configuration & Secret Validation

### Decision
Use `zod` to parse and validate all environment variables at server startup. Fail fast with a clear error if required vars are missing.

### Rationale
- Constitution §VI mandates: "Secrets and credentials MUST NOT be committed. Use environment variables validated at startup via a typed schema (e.g., Zod)."
- Fail-fast startup validation prevents cryptic runtime errors when the PAT is missing.

### Pattern
```typescript
import { z } from "zod";

const ConfigSchema = z.object({
  AZURE_DEVOPS_ORG_URL:  z.string().url(),
  AZURE_DEVOPS_PROJECT:  z.string().min(1),
  AZURE_DEVOPS_TOKEN:    z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
```

### Alternatives considered
- `dotenv` alone: provides no type safety or validation.
- Manual `if (!process.env.X) throw` checks: no schema, type inference, or error aggregation.
