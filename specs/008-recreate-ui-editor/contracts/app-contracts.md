# Application Contract: Recreate UI Editor

**Phase**: 1 - Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-22

This document defines the user-facing route and bundle contracts for the first release of the UI recreation editor.

---

## Route Contract

### `/`

Landing route for source import and project selection.

**Capabilities**

- Start a new import from an HTML snapshot.
- Start a new import from a screenshot image.
- Resume an existing local project.

**Input expectations**

- No required route parameters.
- Optional query parameter `mode` may be used to focus the initial import form.

| Query Parameter | Type | Required | Allowed Values | Description |
|----------------|------|----------|----------------|-------------|
| `mode` | string | No | `html`, `image` | Preselects the import mode. |

---

### `/projects/:projectId`

Main editor route for an existing design project.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `projectId` | string | Yes | non-empty identifier present in local storage | The project to open in edit mode. |

**Behavioral notes**

- Loads the latest editable revision for the project.
- Shows loading, empty, and error states when the project cannot be restored cleanly.
- Keeps source-reference context visible while editing.

---

### `/projects/:projectId/revisions/:revisionId/preview`

Read-only prototype review route.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `projectId` | string | Yes | non-empty identifier | The owning project. |
| `revisionId` | string | Yes | must reference a published revision | The revision to preview. |

**Behavioral notes**

- Editing controls are disabled.
- The rendered screen must match the published revision bundled for review.
- Missing local data must resolve through an imported prototype bundle before rendering.

---

## Import Payload Contract

The app supports two normalized import payloads in v1.

### HTML Snapshot Import

```json
{
  "sourceType": "html_snapshot",
  "sourceLabel": "Marketing hero variant",
  "originalUrl": "https://example.com/pricing",
  "html": "<main><section>...</section></main>"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sourceType` | string | Yes | must equal `html_snapshot` |
| `sourceLabel` | string | Yes | 1-120 characters |
| `originalUrl` | string | No | valid URL when present |
| `html` | string | Yes | non-empty markup payload |

### Screenshot Import

```json
{
  "sourceType": "screenshot_image",
  "sourceLabel": "Dashboard capture",
  "fileName": "dashboard.png",
  "mimeType": "image/png",
  "width": 1440,
  "height": 900,
  "contentRef": "blob:local/1234"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sourceType` | string | Yes | must equal `screenshot_image` |
| `sourceLabel` | string | Yes | 1-120 characters |
| `fileName` | string | Yes | non-empty file name |
| `mimeType` | string | Yes | allowed image type |
| `width` | number | Yes | positive integer |
| `height` | number | Yes | positive integer |
| `contentRef` | string | Yes | valid local object-URL or IndexedDB reference |

---

## Import Result Contract

Successful imports normalize into a consistent result payload used by routing and persistence.

```json
{
  "projectId": "proj_01jv5m",
  "revisionId": "rev_01jv5q",
  "screenId": "screen_01jv62",
  "status": "needs_review",
  "manualReviewCount": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | Created project identifier. |
| `revisionId` | string | First draft revision identifier. |
| `screenId` | string | Initial draft screen identifier. |
| `status` | `'draft_ready' | 'needs_review'` | Import completion status. |
| `manualReviewCount` | number | Count of flagged regions requiring manual attention. |

---

## Prototype Bundle Contract

The share artifact for v1 is a JSON bundle exported from a published revision.

```json
{
  "bundleVersion": 1,
  "project": {
    "id": "proj_01jv5m",
    "name": "Pricing page redesign"
  },
  "revision": {
    "id": "rev_01jv5q",
    "versionNumber": 2,
    "status": "published"
  },
  "screen": {
    "id": "screen_01jv62",
    "rootNodeId": "node_root"
  },
  "nodes": [
    {
      "id": "node_root",
      "componentType": "frame",
      "role": "layout"
    }
  ],
  "exportedAt": "2026-05-22T11:45:00.000Z"
}
```

**Behavioral notes**

- Only published revisions may be exported.
- The bundle must contain all data required for read-only preview rendering.
- Consumers must validate the bundle with Zod before opening preview mode.
- Unknown future bundle versions must fail gracefully with a migration or unsupported-version message.
