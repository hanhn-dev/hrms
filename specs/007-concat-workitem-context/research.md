# Research: Aggregate Work Item Context

**Phase**: 0 - Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## 1. Public tool name and input shape

### Decision
Use the canonical public tool name `az_get_work_item_hierarchy_context` and keep the input singular as one positive integer `id`.

### Rationale
- Repository guidance requires `az_`-prefixed descriptive snake_case names for public Azure DevOps tools.
- The feature is rooted in one hierarchy entry point, not a batch of unrelated roots, so a singular `id` keeps the contract aligned with the user request and with the existing singular/plural naming split in `az_get_work_item` versus `az_get_work_items`.
- Adding `hierarchy` avoids confusion with the existing single-item `az_get_work_item` tool and makes the descendant traversal behavior explicit.

### Alternatives considered
- `az_get_work_item_context`: rejected because it is too close to `az_get_work_item` and does not clearly signal descendant inclusion.
- Comma-separated `ids`: rejected because the feature is defined around one root hierarchy, not multi-root aggregation.
- A name containing `concat`: rejected because current repo tool names describe the resource and outcome, not the implementation verb.

---

## 2. Descendant traversal strategy

### Decision
Reuse the existing recursive descendant traversal pattern built around `System.LinkTypes.Hierarchy-Forward`, deduplicate descendant IDs before hydration, and include the full readable descendant tree rather than only immediate children.

### Rationale
- The current pull-request lookup implementation already traverses full descendants and deduplicates work-item IDs, which matches this feature's scope and edge cases.
- Full descendant traversal aligns with the specification's acceptance scenarios for multi-level child hierarchies.
- Reusing the same traversal shape minimizes risk and keeps hierarchy behavior consistent across Azure DevOps MCP features.

### Alternatives considered
- Immediate-child-only traversal: rejected because it fails the spec's multi-level hierarchy requirement.
- Re-querying descendants one work item at a time without deduplication: rejected because it adds avoidable latency and risks duplicate output entries.

---

## 3. Image attachment representation

### Decision
Represent image context as attachment metadata plus the existing `azdo://workitem/{id}/images/{attachmentId}` MCP resource URI for each image attachment, while excluding non-image attachments from the aggregated image list.

### Rationale
- The repo already exposes image blobs through the `azdo://workitem/{id}/images/{attachmentId}` resource and has no precedent for embedding binary image content directly inside tool JSON.
- Returning metadata plus resource URIs keeps the tool payload small, preserves traceability, and lets MCP clients attach image bytes only when they actually need them.
- The shared integration already flags whether an attachment is an image, so this design can reuse existing mapped data.

### Alternatives considered
- Inline base64 image blobs inside the tool response: rejected because it would duplicate the existing resource channel, inflate the JSON payload, and broaden the contract unnecessarily.
- Returning raw Azure DevOps attachment URLs only: rejected because the repo already has a stronger MCP-native image resource contract that is better suited to AI tooling.

---

## 4. Partial-result and omission behavior

### Decision
Treat failure to read the requested root work item as a hard error, but treat descendant work-item failures and image-attachment metadata failures as omission notices that accompany the readable aggregated result.

### Rationale
- The root work item defines the hierarchy boundary, so if it cannot be read the request cannot be evaluated meaningfully.
- The feature spec explicitly requires continued usefulness when only part of the hierarchy can be read.
- Current work-item lookup logic already distinguishes invalid, not found, and inaccessible cases for requested items; the new aggregated response can extend that idea to descendants and attachment metadata without changing the top-level failure rule.

### Alternatives considered
- Failing the whole request when any descendant is missing or inaccessible: rejected because it violates the partial-result requirement.
- Silently dropping unreadable descendants or attachments: rejected because it removes traceability and makes the result less trustworthy.

---

## 5. Aggregated response shape and ordering

### Decision
Return a structured JSON response with root-level summary counts, root-first ordered per-work-item context entries, explicit missing-content flags for Description, Acceptance Criteria, and images, and a separate omission list for descendants or attachments that could not be included.

### Rationale
- A structured payload is easier for downstream AI agents to inspect than a single unlabeled concatenated text blob.
- Root-first ordering keeps the parent requirement visible before child refinements and provides deterministic output.
- Missing-content flags satisfy the requirement to make empty Description, Acceptance Criteria, or image sets explicit without overloading empty strings or absent arrays with ambiguous meaning.

### Alternatives considered
- One plain concatenated Markdown string: rejected because it weakens traceability and makes image references awkward.
- Returning only an array of work items with no aggregate counts or omission section: rejected because the user and agent would have to infer completion and missing coverage themselves.

---

## 6. Focused validation strategy

### Decision
Validate the feature through targeted Vitest coverage in the shared Azure DevOps integration and az-mcp app packages: integration tests for deep descendant traversal, deduplication, omission notices, and image URI shaping; app tests for tool registration and handler serialization.

### Rationale
- The core logic is in the shared integration package, so its tests should prove hierarchy traversal and response shaping directly.
- The app package should stay thin and only needs focused tests for MCP schema registration and JSON serialization.
- Existing test suites already provide patterns for work-item mapping, pull-request hierarchy traversal, and tool registration.

### Alternatives considered
- Repo-wide build-only validation: rejected because it would not prove the new hierarchy behavior or response contract.
- End-to-end-only coverage: rejected because the behavior is better isolated and cheaper to validate in focused Vitest suites first.
