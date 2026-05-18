# Research: Work Item Pull Request Hash Collection

**Phase**: 0 - Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## 1. Interaction model for user refinement

### Decision
Use a staged MCP tool response instead of trying to prompt the user directly from inside the tool. The first call returns candidate totals, available authors, available target branches, available statuses, and supported sort fields so the agent can ask the user follow-up questions before issuing a second call for the final PR hash list.

### Rationale
- The current MCP server returns JSON text payloads and does not own a direct user-input UI surface.
- A staged response keeps the tool stateless while still supporting an interactive user flow through the agent conversation.
- Returning candidate totals and facet options before finalization matches the feature requirement that users can decide how to filter and sort before seeing the final list of hashes.
- The same contract supports users who skip refinement by making one explicit unfiltered finalization call.

### Alternatives considered
- Prompting for input inside the tool execution: rejected because the current MCP tool model in this repo is request-response only.
- Returning the final full hash list immediately on the first call: rejected because it bypasses the requested user-driven filter step and forces the agent to ask follow-up questions after already over-fetching the final response.

---

## 2. Discovering pull requests from requested and child work items

### Decision
Fetch the requested work items with relations, extract immediate child links from hierarchy-forward relations, batch-fetch the child work items, keep only eligible child types such as Task and Issue, and inspect both requested and eligible child work items for pull-request artifact relations.

### Rationale
- The current integration already relies on expanded work item relations for attachment metadata, so relations are the correct surface for linked artifacts and child traversal.
- Limiting traversal to immediate children keeps the scope aligned with the specification and bounds the discovery cost.
- Hydrating child work items before using them allows the implementation to confirm the work item type and preserve traceability for each PR candidate.

### Alternatives considered
- Traversing the full descendant tree: rejected because it expands scope and weakens predictable performance.
- Looking only at directly requested work items: rejected because it misses the required Task and Issue child links.

---

## 3. Pull request identity and hash extraction

### Decision
Parse Azure DevOps pull-request artifact links into repository-scoped PR references, hydrate each unique PR through the Git API, and expose the available commit hashes from the hydrated PR record, prioritizing merge commit hash when present and including source and target commit hashes for traceability.

### Rationale
- Work item relations identify linked artifacts, but the final summary needs PR metadata such as author, target branch, status, merged date, and code-change hashes.
- A hydrated PR record provides the fields needed for filtering and sorting in one normalized candidate shape.
- Merge commit hashes are only present for completed PRs, so source and target commit hashes are needed to keep open or abandoned PRs useful in the final summary.

### Alternatives considered
- Reporting only the artifact URI without PR hydration: rejected because it does not provide author, branch, status, merged date, or usable hash fields.
- Fetching repository history independently of the PR record: rejected because it introduces unnecessary scope and weakens traceability back to the linked PR.

---

## 4. Filtering, sorting, and total counts

### Decision
Build filter facets from the fully hydrated candidate PR set, apply author, target-branch, and status filters in memory, and support explicit sort choices from the staged response, with `mergedDate` as the required user-facing sort field and a deterministic fallback sort by pull-request ID.

### Rationale
- Once the candidate PR set is hydrated, filter and sort operations are pure in-memory transformations and should not trigger more Azure DevOps calls.
- Returning the total candidate count in the first stage and the total matching count in the final stage gives the user visibility into how much the refinement changed the result.
- A deterministic fallback order is required because some PRs have no merged date.

### Alternatives considered
- Re-querying Azure DevOps for each filter change: rejected because it adds unnecessary latency and complexity.
- Supporting only one implicit sort order: rejected because the user explicitly wants to choose sorting before the final summary is returned.

---

## 5. Performance and batching strategy

### Decision
Batch work-item reads wherever possible, deduplicate PR references before Git API hydration, and group PR hydration by repository identity so the dominant network cost is bounded by unique linked PRs rather than raw work-item relation count.

### Rationale
- Requested work items and immediate child work items can be fetched in bulk through the existing work item API surface.
- The same PR can be linked from multiple requested or child work items, so deduplication before Git API hydration is mandatory for both correctness and performance.
- Grouping by repository keeps the implementation aligned with Azure DevOps PR identity, which is repository-scoped.

### Alternatives considered
- Hydrating every relation independently: rejected because duplicates would cause unnecessary Git API calls.
- Fetching PR details lazily after the user selects filters: rejected because filter options such as author and target branch are not known until the candidates are hydrated.