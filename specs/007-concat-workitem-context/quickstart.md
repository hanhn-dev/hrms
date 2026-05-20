# Quickstart: Aggregate Work Item Context

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

This quickstart describes how to validate and exercise the planned hierarchy-context tool once implementation begins.

---

## Prerequisites

- Node.js 22.18+ for local build workflows in this repo
- npm 10+
- An Azure DevOps organization and project configured for `apps/az-mcp`
- A Personal Access Token with work-item read access

---

## 1. Install dependencies

From the repo root:

```bash
npm install
```

---

## 2. Configure the az-mcp server

Create or update `apps/az-mcp/.env` with the existing Azure DevOps settings:

```env
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org
AZURE_DEVOPS_PROJECT=YourProjectName
AZURE_DEVOPS_TOKEN=your-personal-access-token
```

---

## 3. Run focused tests during implementation

Use the narrowest validation slices first:

```bash
npm run test --workspace=packages/integrations/azure-devops -- work-items
npm run test --workspace=apps/az-mcp -- get-work-item-hierarchy-context
```

Then run the app and package test suites once the focused checks pass:

```bash
npm run test --workspace=packages/integrations/azure-devops
npm run test --workspace=apps/az-mcp
```

---

## 4. Build the MCP server

```bash
npm run build --workspace=apps/az-mcp
```

The server runtime artifact remains `apps/az-mcp/dist/index.js`.

---

## 5. Invoke the new tool

Once the feature is implemented and the server is connected to an MCP client, call:

```json
{
  "name": "az_get_work_item_hierarchy_context",
  "arguments": {
    "id": 135898
  }
}
```

Expected behavior:

- The response includes the requested root work item and all readable descendants in one JSON payload.
- Each entry identifies its source work item and whether it is the root or a descendant.
- Description and Acceptance Criteria are returned as Markdown.
- Image attachments are returned as metadata plus `azdo://workitem/{id}/images/{attachmentId}` resource URIs.
- Missing descendants or attachments are listed under `omissions` instead of silently disappearing.

---

## 6. Attach images when the client supports resources

If the response contains image attachment entries such as:

```json
{
  "attachmentId": "img-1",
  "name": "flow.png",
  "resourceUri": "azdo://workitem/135898/images/img-1"
}
```

use the returned `resourceUri` to attach the actual image bytes to the conversation context through the existing work-item image resource.

---

## 7. Smoke-check edge cases

Use a small hierarchy fixture or known Azure DevOps examples to verify:

- Root item with no children still returns one entry.
- Multi-level descendants appear exactly once.
- Non-image attachments are excluded from `imageAttachments`.
- Missing descendants or attachment metadata create `omissions` entries.
- An unreadable root work item returns a clear error.
