# MCP Tool Contract: Multiple Work Item Retrieval

**Phase**: 1 - Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-18

This document defines the MCP contract changes required to add multi-item retrieval without breaking the existing single-item workflow.

## Tools

### `get_work_item`

Existing single-item tool retained for backward compatibility.

**Input schema**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | integer | Yes | positive integer | One Azure DevOps work item ID |

**Output**

Returns the existing `WorkItem` JSON payload serialized into `content[0].text`.

**Compatibility note**

- This tool remains unchanged so existing MCP clients and prompts continue to work.

---

### `get_work_items`

New multi-item retrieval tool for comma-separated IDs.

**Input schema**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `ids` | string | Yes | non-empty string | Comma-separated Azure DevOps work item IDs, for example `"1,2, 3,4"` |

**Behavior rules**

- Optional whitespace around commas is allowed.
- Input order is preserved in the output.
- Duplicate requested IDs are allowed and appear in the ordered results, but valid IDs are deduplicated before the Azure DevOps batch call.
- Requests above 25 parsed IDs are rejected with a clear validation error.

**Output**

`content[0].text` contains a JSON-serialized `WorkItemBatchResult` object:

```json
{
  "requestedCount": 4,
  "successCount": 3,
  "issueCount": 1,
  "results": [
    {
      "index": 0,
      "input": "1",
      "id": 1,
      "status": "found",
      "workItem": {
        "id": 1,
        "title": "Story A",
        "type": "User Story",
        "state": "Active",
        "description": "Description",
        "acceptanceCriteria": "- AC 1",
        "attachments": [],
        "tags": [],
        "assignedTo": null,
        "iterationPath": "Project\\Sprint 1",
        "areaPath": "Project",
        "parentId": null,
        "url": "https://dev.azure.com/example/_workitems/edit/1"
      },
      "message": null
    },
    {
      "index": 1,
      "input": "abc",
      "id": null,
      "status": "invalid",
      "workItem": null,
      "message": "Invalid work item ID: abc"
    }
  ]
}
```

**Error responses**

| Scenario | Error message pattern |
|----------|------------------------|
| Empty input | `"Provide at least one work item ID"` |
| More than 25 IDs | `"A maximum of 25 work item IDs is supported per request"` |
| Azure DevOps batch failure | `"Azure DevOps API error: {message}"` |

**Performance contract**

- Valid IDs are retrieved through one Azure DevOps batch call for the initial fetch path.
- Follow-up Azure DevOps calls are limited to IDs omitted from the batch response and used only for issue classification.

---

## Resources

### `azdo://workitem/{id}`

No contract change. Single work item resources remain available exactly as before.

### `azdo://workitem/{id}/images/{attachmentId}`

No contract change. Image resource behavior remains unchanged.