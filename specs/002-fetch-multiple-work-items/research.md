# Research: Multiple Work Item Retrieval

**Phase**: 0 - Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## 1. Azure DevOps batch retrieval strategy

### Decision
Use a single Azure DevOps batch retrieval call for valid IDs in the initial implementation, backed by `getWorkItems(..., WorkItemExpand.Relations, WorkItemErrorPolicy.Omit)` for up to 25 IDs.

### Rationale
- The existing code already uses Azure DevOps batch retrieval for list and query summary flows, so the same integration surface can be extended for full-detail work items.
- Repeating the current single-item path for each requested ID would multiply network round-trips and make performance degrade linearly with the number of IDs.
- A single batch call keeps the dominant work item fetch cost to one Azure request for the common success path.
- The current feature only guarantees support for 25 IDs, which stays well below Azure DevOps' 200-item batch ceiling.

### Alternatives considered
- Repeated `getWorkItem()` calls per ID: rejected because it creates unnecessary round-trips and weakens predictable latency for 10 to 25 IDs.
- Chunked batching from day one: deferred. It is not required for the 25-ID scope, though the design should remain easy to extend if the limit grows later.

---

## 2. Request parsing and order preservation

### Decision
Parse the user input once into ordered request entries, validate tokens locally, deduplicate only the valid numeric IDs for transport, then reconstruct the final response in the original request order.

### Rationale
- The spec requires optional whitespace support and preserved output order.
- Deduplicating only at transport time avoids repeated Azure fetches while still allowing duplicate IDs to appear multiple times in the final ordered response if the user asked for them multiple times.
- Local validation catches malformed values such as `abc`, empty tokens, and trailing commas before any network call is made.

### Alternatives considered
- Sending duplicate IDs directly to Azure DevOps: rejected because it wastes network and mapping work.
- Returning results in Azure DevOps response order: rejected because it breaks the user's input order requirement.

---

## 3. Mixed-result classification

### Decision
Return per-entry outcomes and use targeted follow-up lookups only for IDs omitted from the batch response so the system can distinguish malformed, not found, and inaccessible cases.

### Rationale
- Azure DevOps batch retrieval with omit-on-error can return only found items, which is efficient but not sufficient on its own for user-facing issue classification.
- Restricting follow-up calls to omitted IDs preserves fast performance in the common case where most or all requested IDs are valid.
- Per-entry outcomes satisfy the spec's requirement to keep successful results even when some IDs fail.

### Alternatives considered
- Failing the entire batch on the first problem: rejected because it violates the spec's mixed-result requirement.
- Returning only a flat success list plus one generic error: rejected because users would not know which requested IDs failed.

---

## 4. Performance-sensitive mapping behavior

### Decision
Keep attachment metadata enrichment best-effort and reuse relation-provided metadata first; only perform attachment metadata fetches when required and keep fallback classification work limited to omitted IDs.

### Rationale
- Once work items are batched, the next likely latency source is attachment metadata lookup for attached files.
- The current integration already avoids extra metadata fetches when Azure relation attributes provide content type and size.
- Preserving that behavior is enough for the first batch implementation, provided the batch path does not add new unnecessary per-item calls.

### Alternatives considered
- Fully eager attachment-content fetches: rejected because binary downloads are unnecessary for work item detail retrieval.
- Removing attachment metadata entirely for the batch path: rejected because the spec requires the same detail set users already receive from single-item retrieval.