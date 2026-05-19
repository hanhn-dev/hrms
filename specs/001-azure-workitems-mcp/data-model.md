# Data Model: Azure Work Items MCP Server

**Phase**: 1 — Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-14

---

## Entities

### WorkItem

The full representation of an Azure DevOps work item, returned by `az_get_work_item` and the `azdo://workitem/{id}` resource.

| Field                | TypeScript Type         | Azure DevOps Field                              | Notes                                          |
|---------------------|-------------------------|-------------------------------------------------|------------------------------------------------|
| `id`                | `number`                | `System.Id`                                     | Unique work item ID                            |
| `title`             | `string`                | `System.Title`                                  | Plain text                                     |
| `type`              | `string`                | `System.WorkItemType`                           | e.g., `"User Story"`, `"Bug"`, `"Task"`        |
| `state`             | `string`                | `System.State`                                  | e.g., `"Active"`, `"New"`, `"Closed"`          |
| `description`       | `string`                | `System.Description`                            | Converted from HTML to Markdown                |
| `acceptanceCriteria`| `string`                | `Microsoft.VSTS.Common.AcceptanceCriteria`      | Converted from HTML to Markdown; `""` if unset |
| `attachments`       | `WorkItemAttachment[]`  | `relations[]` where `rel === "AttachedFile"`  | Attachment metadata with IDs, size, MIME, and `isImage` hint |
| `tags`              | `string[]`              | `System.Tags`                                   | Split from semicolon-separated string          |
| `assignedTo`        | `string \| null`        | `System.AssignedTo` (display name)              | `null` if unassigned                           |
| `iterationPath`     | `string`                | `System.IterationPath`                          | e.g., `"MyProject\\Sprint 1"`                 |
| `areaPath`          | `string`                | `System.AreaPath`                               |                                                |
| `parentId`          | `number \| null`        | `System.Parent`                                 | `null` if no parent                            |
| `url`               | `string`                | Computed from org URL + ID                      | Human-readable browser URL                    |

**TypeScript interface** (lives in `packages/integrations/azure-devops/src/types.ts`):
```typescript
export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly description: string;
  readonly acceptanceCriteria: string;
  readonly attachments: readonly WorkItemAttachment[];
  readonly tags: readonly string[];
  readonly assignedTo: string | null;
  readonly iterationPath: string;
  readonly areaPath: string;
  readonly parentId: number | null;
  readonly url: string;
}
```

---

### WorkItemAttachment

Attachment metadata returned for a full work item fetch.

| Field     | TypeScript Type   | Source                         | Notes                                   |
|-----------|-------------------|--------------------------------|-----------------------------------------|
| `id`      | `string`          | `relation.attributes.id` or URL path | Stable attachment identifier for resource URIs |
| `name`    | `string`          | `relation.attributes.name`     | Falls back to the relation URL basename |
| `url`     | `string`          | `relation.url`                 | Azure DevOps attachment API URL         |
| `comment` | `string \| null`  | `relation.attributes.comment`  | `null` when unset                       |
| `contentType` | `string \| null` | Attachment response headers or relation attributes | Best-effort MIME type when Azure provides it |
| `size`    | `number \| null`  | Attachment response headers or relation attributes | Best-effort byte size when Azure provides it |
| `isImage` | `boolean`         | Derived from file extension    | True for common image formats           |

```typescript
export interface WorkItemAttachment {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly comment: string | null;
  readonly contentType: string | null;
  readonly size: number | null;
  readonly isImage: boolean;
}
```

---

### WorkItemSummary

Lightweight representation used in list and query responses to avoid over-fetching.

| Field    | TypeScript Type | Azure DevOps Field      | Notes                         |
|---------|-----------------|-------------------------|-------------------------------|
| `id`    | `number`        | `System.Id`             |                               |
| `title` | `string`        | `System.Title`          |                               |
| `type`  | `string`        | `System.WorkItemType`   |                               |
| `state` | `string`        | `System.State`          |                               |
| `url`   | `string`        | Computed                |                               |

```typescript
export interface WorkItemSummary {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly url: string;
}
```

---

### AzureDevOpsConfig

Runtime configuration loaded from environment variables at startup.

| Field           | TypeScript Type | Env Var                     | Notes                              |
|----------------|-----------------|-----------------------------|------------------------------------|
| `orgUrl`        | `string`        | `AZURE_DEVOPS_ORG_URL`      | e.g., `https://dev.azure.com/myorg` |
| `project`       | `string`        | `AZURE_DEVOPS_PROJECT`      | Default project for unscoped queries|
| `token`         | `string`        | `AZURE_DEVOPS_TOKEN`        | Personal Access Token (never logged)|

```typescript
export interface AzureDevOpsConfig {
  readonly orgUrl: string;
  readonly project: string;
  readonly token: string;
}
```

---

### ListWorkItemsFilter

Input filter for the `az_list_work_items` tool.

| Field       | TypeScript Type    | Required | Notes                                        |
|-------------|-------------------|----------|----------------------------------------------|
| `project`   | `string`          | No       | Defaults to `AzureDevOpsConfig.project`      |
| `type`      | `string \| null`  | No       | e.g., `"User Story"`, `"Bug"`, `"Task"`      |
| `state`     | `string \| null`  | No       | e.g., `"Active"`, `"New"`                    |
| `iteration` | `string \| null`  | No       | Iteration path; uses WIQL `UNDER` operator   |
| `top`       | `number`          | No       | Max results; defaults to `50`, max `200`     |

```typescript
export interface ListWorkItemsFilter {
  readonly project?: string;
  readonly type?: string | null;
  readonly state?: string | null;
  readonly iteration?: string | null;
  readonly top?: number;
}
```

---

## State Transitions

Work item `state` is managed entirely by Azure DevOps and is read-only in v1. No state machine modelling is required on the MCP server side.

---

## Validation Rules

| Rule | Description |
|------|-------------|
| `id` must be positive integer | Enforced by Zod schema on tool input: `z.number().int().positive()` |
| `top` clipped to `[1, 200]` | Enforced before passing to Azure DevOps API to stay within page-size limits |
| `orgUrl` must be a valid URL | Enforced by Zod `.url()` during config loading |
| `token` and `project` must be non-empty | Enforced by Zod `.min(1)` during config loading |
| HTML fields sanitised before return | `htmlToMarkdown()` is applied to `description` and `acceptanceCriteria` before constructing `WorkItem` |
| Attachment relations included on full fetch | `getWorkItem()` requests `WorkItemExpand.Relations` so attached files are available to AI agents |

---

## Field Mapping from Azure DevOps API Response

```typescript
// packages/integrations/azure-devops/src/work-items.ts
function mapWorkItem(raw: AzureDevOpsWorkItem, orgUrl: string): WorkItem {
  const f = raw.fields ?? {};
  const tagsRaw: string = f["System.Tags"] ?? "";
  return {
    id:                  raw.id!,
    title:               f["System.Title"] ?? "",
    type:                f["System.WorkItemType"] ?? "",
    state:               f["System.State"] ?? "",
    description:         htmlToMarkdown(f["System.Description"]),
    acceptanceCriteria:  htmlToMarkdown(f["Microsoft.VSTS.Common.AcceptanceCriteria"]),
    attachments:         mapAttachments(raw),
    tags:                tagsRaw ? tagsRaw.split(";").map(t => t.trim()) : [],
    assignedTo:          (f["System.AssignedTo"] as { displayName?: string } | null)?.displayName ?? null,
    iterationPath:       f["System.IterationPath"] ?? "",
    areaPath:            f["System.AreaPath"] ?? "",
    parentId:            f["System.Parent"] ?? null,
    url:                 `${orgUrl}/_workitems/edit/${raw.id}`,
  };
}
```
