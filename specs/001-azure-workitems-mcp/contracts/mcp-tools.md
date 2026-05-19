# MCP Tool & Resource Contracts

**Phase**: 1 — Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-14

This document defines the complete interface contract for the Azure Work Items MCP server: all tools and resources exposed to AI agents.

---

## Tools

### `az_get_work_item`

Retrieves the full details of a single Azure DevOps work item by ID, with HTML fields converted to Markdown and attachment metadata included for AI agents.

**Input schema**

| Parameter | Type    | Required | Validation          | Description                     |
|-----------|---------|----------|---------------------|---------------------------------|
| `id`      | integer | Yes      | positive integer    | The Azure DevOps work item ID   |

**Output** — `content[0].text` contains a JSON-serialised `WorkItem`:

```json
{
  "id": 1234,
  "title": "User can reset password via email link",
  "type": "User Story",
  "state": "Active",
  "description": "## Background\n\nUsers occasionally forget their password...",
  "acceptanceCriteria": "- [ ] Reset link sent within 30 seconds\n- [ ] Link expires after 24 hours\n- [ ] Works from mobile and desktop",
  "attachments": [
    {
      "id": "9c4270d1-1df0-4a60-8866-8510f597de0b",
      "name": "reset-flow.png",
      "url": "https://dev.azure.com/myorg/_apis/wit/attachments/...",
      "comment": "Current user journey",
      "contentType": "image/png",
      "size": 48321,
      "isImage": true
    }
  ],
  "tags": ["auth", "ux"],
  "assignedTo": "Jane Smith",
  "iterationPath": "MyProject\\Sprint 3",
  "areaPath": "MyProject\\Auth",
  "parentId": 1100,
  "url": "https://dev.azure.com/myorg/_workitems/edit/1234"
}
```

**Error responses**

| Scenario                          | Error message pattern                               |
|----------------------------------|-----------------------------------------------------|
| Work item not found              | `"Work item {id} not found"`                        |
| Azure DevOps API unreachable     | `"Azure DevOps API error: {status} {message}"`      |
| Invalid credentials              | `"Authentication failed: check AZURE_DEVOPS_TOKEN"` |

**Zod schema** (in `apps/az-mcp/src/tools/get-work-item.ts`):
```typescript
{ id: z.number().int().positive() }
```

---

### `az_list_work_items`

Lists work items from a project with optional filters. Returns lightweight summaries.

**Input schema**

| Parameter   | Type    | Required | Validation         | Description                                                         |
|------------|---------|----------|--------------------|---------------------------------------------------------------------|
| `project`   | string  | No       | non-empty string   | Azure DevOps project name. Defaults to `AZURE_DEVOPS_PROJECT`.      |
| `type`      | string  | No       | non-empty string   | Work item type filter (e.g., `"User Story"`, `"Bug"`, `"Task"`).    |
| `state`     | string  | No       | non-empty string   | State filter (e.g., `"Active"`, `"New"`, `"Closed"`).               |
| `iteration` | string  | No       | non-empty string   | Iteration path; uses WIQL `UNDER` operator (includes sub-iterations).|
| `top`       | integer | No       | 1–200, default 50  | Maximum number of results to return.                                |

**Output** — `content[0].text` contains a JSON-serialised `WorkItemSummary[]`:

```json
[
  { "id": 1234, "title": "User can reset password", "type": "User Story", "state": "Active", "url": "https://..." },
  { "id": 1235, "title": "Fix login redirect bug",  "type": "Bug",        "state": "New",    "url": "https://..." }
]
```

Returns `[]` when no items match (not an error).

**Zod schema**:
```typescript
{
  project:   z.string().min(1).optional(),
  type:      z.string().min(1).optional(),
  state:     z.string().min(1).optional(),
  iteration: z.string().min(1).optional(),
  top:       z.number().int().min(1).max(200).default(50).optional(),
}
```

---

### `az_query_work_items`

Executes an arbitrary WIQL (Work Item Query Language) query and returns work item summaries.

**Input schema**

| Parameter | Type    | Required | Validation      | Description                                   |
|-----------|---------|----------|-----------------|-----------------------------------------------|
| `wiql`    | string  | Yes      | non-empty string | A valid WIQL SELECT statement                |
| `top`     | integer | No       | 1–200, default 50 | Maximum results (applied after WIQL runs)   |

**Example WIQL**:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = 'MyProject'
  AND [System.WorkItemType] = 'User Story'
  AND [System.State] <> 'Closed'
ORDER BY [System.ChangedDate] DESC
```

**Output** — same shape as `az_list_work_items`: `WorkItemSummary[]` as JSON in `content[0].text`.

**Error responses**

| Scenario            | Error message pattern                          |
|--------------------|------------------------------------------------|
| Invalid WIQL syntax | `"WIQL query error: {azure devops message}"`   |

**Zod schema**:
```typescript
{
  wiql: z.string().min(1),
  top:  z.number().int().min(1).max(200).default(50).optional(),
}
```

---

## Resources

### `azdo://workitem/{id}`

Exposes individual work items as named MCP resources. MCP clients that support resource attachment (e.g., Claude Desktop) can reference a work item directly in conversation context.

**URI template**: `azdo://workitem/{id}` where `{id}` is a positive integer.

**Content** — same JSON payload as `az_get_work_item`, returned as:
```typescript
{
  uri: "azdo://workitem/1234",
  name: "Work Item #1234: User can reset password via email link",
  mimeType: "application/json",
  text: "<JSON WorkItem>",
}
```

**Resource list**: The server exposes a static resource template (not a dynamic list) since work item discovery is done via tools (`az_list_work_items`/`az_query_work_items`).

### `azdo://workitem/{id}/images/{attachmentId}`

Exposes image attachments from a work item as binary MCP resources. Clients that support blob resources can attach the actual image bytes to conversation context instead of only receiving a URL.

**URI template**: `azdo://workitem/{id}/images/{attachmentId}` where `{id}` is a positive integer and `{attachmentId}` matches `attachments[].id` from `az_get_work_item`.

**Content** — returned as a blob resource:
```typescript
{
  uri: "azdo://workitem/1234/images/9c4270d1-1df0-4a60-8866-8510f597de0b",
  mimeType: "image/png",
  blob: "<base64 image bytes>",
}
```

**Error responses**

| Scenario | Error message pattern |
|----------|------------------------|
| Attachment not found on work item | `"Attachment {attachmentId} not found on work item {id}"` |
| Attachment is not an image | `"Attachment {attachmentId} on work item {id} is not an image"` |

---

## Capability Declaration

The MCP server declares the following capabilities at connection time:

```typescript
{
  capabilities: {
    tools: {},      // supports tool listing and invocation
    resources: {
      subscribe: false,   // no push updates
      listChanged: false  // static resource template
    }
  }
}
```
