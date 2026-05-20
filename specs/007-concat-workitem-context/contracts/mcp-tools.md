# MCP Tool Contract: Aggregate Work Item Context

**Phase**: 1 - Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-19

This document defines the public MCP contract for the new Azure DevOps hierarchy-context tool delivered by this feature.

---

## Tool

### `az_get_work_item_hierarchy_context`

Returns one structured JSON payload containing the requested root work item plus all readable descendant work items, with source-labeled Description, Acceptance Criteria, image attachment context, and omission notices for descendants or attachments that could not be included.

**Input schema**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | integer | Yes | positive integer | The root Azure DevOps work item ID whose hierarchy context should be aggregated. |

**Zod schema**

```typescript
{ id: z.number().int().positive() }
```

**Output**

`content[0].text` contains a JSON-serialized `WorkItemHierarchyContextResponse`.

```json
{
  "rootWorkItemId": 135898,
  "includedWorkItemCount": 4,
  "omittedCount": 1,
  "items": [
    {
      "workItemId": 135898,
      "depth": 0,
      "relationToRoot": "root",
      "title": "Parent story",
      "type": "User Story",
      "state": "Active",
      "parentId": null,
      "url": "https://dev.azure.com/example/_workitems/edit/135898",
      "description": "## Background\n\nUsers need the full story context...",
      "acceptanceCriteria": "- [ ] Child work items are included\n- [ ] Images stay traceable",
      "missing": {
        "description": false,
        "acceptanceCriteria": false,
        "imageAttachments": false
      },
      "imageAttachments": [
        {
          "attachmentId": "img-1",
          "name": "flow.png",
          "resourceUri": "azdo://workitem/135898/images/img-1",
          "comment": "Current user journey",
          "contentType": "image/png",
          "size": 48321
        }
      ]
    },
    {
      "workItemId": 135899,
      "depth": 1,
      "relationToRoot": "descendant",
      "title": "Child task",
      "type": "Task",
      "state": "Done",
      "parentId": 135898,
      "url": "https://dev.azure.com/example/_workitems/edit/135899",
      "description": null,
      "acceptanceCriteria": "- [ ] API contract remains stable",
      "missing": {
        "description": true,
        "acceptanceCriteria": false,
        "imageAttachments": true
      },
      "imageAttachments": []
    }
  ],
  "omissions": [
    {
      "kind": "work_item",
      "workItemId": 135902,
      "attachmentId": null,
      "status": "inaccessible",
      "message": "Work item 135902 is inaccessible with current credentials"
    }
  ]
}
```

**Error responses**

| Scenario | Error message pattern |
|----------|------------------------|
| Invalid ID | MCP schema validation rejects the request before handler execution |
| Root work item not found | `"Work item {id} not found"` |
| Root work item inaccessible | `"Work item {id} is inaccessible with current credentials"` |
| Azure DevOps API failure while reading the root | `"Azure DevOps API error: {message}"` |

**Behavioral notes**

- The root work item is always included first when it is readable.
- Descendants are discovered recursively through `System.LinkTypes.Hierarchy-Forward` relations.
- Each readable work item appears at most once in `items`.
- Only image attachments are returned in `imageAttachments`; non-image attachments are excluded.
- Images are referenced by MCP resource URI rather than embedded as binary content.
- When descendant work items or attachment metadata cannot be included, the response remains successful and records those gaps in `omissions`.

---

## Reused Resources

### `azdo://workitem/{id}/images/{attachmentId}`

This feature reuses the existing image resource contract for binary image delivery. The new tool returns `resourceUri` values that point to this resource; it does not introduce a new image resource shape.

**URI template**: `azdo://workitem/{id}/images/{attachmentId}`

**Purpose in this feature**

- Lets MCP clients attach actual image bytes after the aggregated hierarchy context identifies which images matter.
- Keeps the tool response text-based and compact while preserving image traceability.
