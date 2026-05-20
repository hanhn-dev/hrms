# Data Model: Aggregate Work Item Context

**Phase**: 1 - Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

---

## Entities

### WorkItemHierarchyContextResponse

The top-level response returned by `az_get_work_item_hierarchy_context`.

| Field | Type | Description |
|-------|------|-------------|
| `rootWorkItemId` | `number` | The requested root work item ID. |
| `includedWorkItemCount` | `number` | Count of readable work items returned in `items`. |
| `omittedCount` | `number` | Count of omission records returned in `omissions`. |
| `items` | `WorkItemHierarchyContextEntry[]` | Root-first ordered context entries for the readable hierarchy. |
| `omissions` | `WorkItemHierarchyContextOmission[]` | Descendant or attachment omissions that were detected while building the response. |

```typescript
export interface WorkItemHierarchyContextResponse {
  readonly rootWorkItemId: number;
  readonly includedWorkItemCount: number;
  readonly omittedCount: number;
  readonly items: readonly WorkItemHierarchyContextEntry[];
  readonly omissions: readonly WorkItemHierarchyContextOmission[];
}
```

---

### WorkItemHierarchyContextEntry

One readable work item in the requested hierarchy, with explicit content and traceability.

| Field | Type | Description |
|-------|------|-------------|
| `workItemId` | `number` | Source work item ID. |
| `depth` | `number` | Depth from the requested root; root is `0`. |
| `relationToRoot` | `'root' \| 'descendant'` | Whether this entry is the root or a descendant. |
| `title` | `string` | Work item title. |
| `type` | `string` | Azure DevOps work item type. |
| `state` | `string` | Azure DevOps work item state. |
| `parentId` | `number \| null` | Direct parent work item ID, if known. |
| `url` | `string` | Human-readable Azure DevOps work item URL. |
| `description` | `string \| null` | Markdown description, or `null` when absent. |
| `acceptanceCriteria` | `string \| null` | Markdown acceptance criteria, or `null` when absent. |
| `missing` | `WorkItemContextMissingFields` | Explicit flags for absent content. |
| `imageAttachments` | `ImageAttachmentContext[]` | Only image attachments for this work item. |

```typescript
export interface WorkItemHierarchyContextEntry {
  readonly workItemId: number;
  readonly depth: number;
  readonly relationToRoot: 'root' | 'descendant';
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly parentId: number | null;
  readonly url: string;
  readonly description: string | null;
  readonly acceptanceCriteria: string | null;
  readonly missing: WorkItemContextMissingFields;
  readonly imageAttachments: readonly ImageAttachmentContext[];
}
```

---

### WorkItemContextMissingFields

Explicit missing-content markers for one hierarchy entry.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `boolean` | `true` when the work item has no Description content. |
| `acceptanceCriteria` | `boolean` | `true` when the work item has no Acceptance Criteria content. |
| `imageAttachments` | `boolean` | `true` when the work item has no included image attachments. |

```typescript
export interface WorkItemContextMissingFields {
  readonly description: boolean;
  readonly acceptanceCriteria: boolean;
  readonly imageAttachments: boolean;
}
```

---

### ImageAttachmentContext

The image-specific attachment representation returned in the aggregated hierarchy context.

| Field | Type | Description |
|-------|------|-------------|
| `attachmentId` | `string` | Stable attachment identifier. |
| `name` | `string` | Attachment file name. |
| `resourceUri` | `string` | MCP image resource URI: `azdo://workitem/{workItemId}/images/{attachmentId}`. |
| `comment` | `string \| null` | Optional attachment comment from Azure DevOps. |
| `contentType` | `string \| null` | Best-effort MIME type. |
| `size` | `number \| null` | Best-effort byte size. |

```typescript
export interface ImageAttachmentContext {
  readonly attachmentId: string;
  readonly name: string;
  readonly resourceUri: string;
  readonly comment: string | null;
  readonly contentType: string | null;
  readonly size: number | null;
}
```

---

### WorkItemHierarchyContextOmission

A descendant or attachment that could not be fully included in the aggregated response.

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `'work_item' \| 'attachment'` | What was omitted. |
| `workItemId` | `number` | The affected work item ID. |
| `attachmentId` | `string \| null` | Attachment identifier when `kind === 'attachment'`. |
| `status` | `'not_found' \| 'inaccessible' \| 'metadata_unavailable'` | Normalized omission status. |
| `message` | `string` | Human-readable reason for the omission. |

```typescript
export interface WorkItemHierarchyContextOmission {
  readonly kind: 'work_item' | 'attachment';
  readonly workItemId: number;
  readonly attachmentId: string | null;
  readonly status: 'not_found' | 'inaccessible' | 'metadata_unavailable';
  readonly message: string;
}
```

---

## Relationships

- One `WorkItemHierarchyContextResponse` contains many `WorkItemHierarchyContextEntry` records.
- One `WorkItemHierarchyContextEntry` contains zero or more `ImageAttachmentContext` records.
- One `WorkItemHierarchyContextResponse` contains zero or more `WorkItemHierarchyContextOmission` records.
- `WorkItemHierarchyContextEntry.parentId` preserves the source hierarchy relationship from Azure DevOps for readable items.

---

## Validation Rules

| Rule | Description |
|------|-------------|
| `id` must be a positive integer | Enforced by the MCP tool's Zod schema: `z.number().int().positive()`. |
| Root work item must be readable | If the requested root cannot be read, the tool returns an error instead of a partial response. |
| Descendants are unique by work item ID | Hierarchy traversal deduplicates IDs before hydration and response shaping. |
| Output order is deterministic | Root item is first; descendants follow in stable root-first hierarchy order. |
| Description and Acceptance Criteria use Markdown | The shared integration continues to reuse the existing HTML-to-Markdown conversion rules. |
| Only image attachments become `ImageAttachmentContext` | Attachments are filtered by the existing `isImage` classification. |
| `resourceUri` must match the existing image resource contract | Every image reference follows `azdo://workitem/{workItemId}/images/{attachmentId}`. |
| Omitted descendants and attachments must be explicit | Partial failures are recorded in `omissions` rather than silently dropped. |

---

## State Transitions

This feature is read-only. Work item lifecycle state remains managed by Azure DevOps and is represented only as returned metadata in each context entry.
