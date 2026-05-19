# Research: Prefix Azure MCP Tool Names

**Phase**: 0 - Pre-design research  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## 1. Canonical public naming rule

### Decision
Adopt `az_<snake_case_tool_name>` as the canonical public naming convention for every Azure DevOps MCP tool exposed by this repository.

### Rationale
- The `az_` prefix makes Azure-specific MCP capabilities immediately identifiable in tool discovery results.
- Keeping the remainder of the name in snake_case preserves the current naming style while adding a consistent namespace.
- A single canonical form is easier to validate across runtime registration, tests, and documentation than mixed prefixed and unprefixed names.

### Alternatives considered
- Keeping the existing unprefixed names: rejected because it does not satisfy the feature goal.
- Using a longer prefix such as `azure_`: rejected because the requested convention is `az_` and shorter names fit MCP tool catalogs better.

---

## 2. Backward compatibility strategy

### Decision
Treat the prefixed names as the only canonical public contract in this feature and do not add runtime aliases for the previous unprefixed tool names.

### Rationale
- The specification explicitly scopes backward-compatibility aliases out unless requested later.
- Alias support would expand implementation, testing, and documentation complexity for a feature whose goal is to normalize the public contract.
- A clean rename makes mismatched examples and stale callers visible during validation instead of hiding drift behind temporary compatibility layers.

### Alternatives considered
- Supporting both old and new names indefinitely: rejected because it weakens the canonical naming rule and creates duplicate public surfaces.
- Supporting short-term aliases only in runtime code: rejected because it still requires additional discovery, invocation, and migration rules not requested by the spec.

---

## 3. Rollout scope for repository-owned references

### Decision
Update every repository-owned surface that presents or validates the current canonical Azure DevOps MCP tool names, with primary emphasis on runtime registration, server-level MCP tests, contracts, quickstarts, tasks, and future-facing guidance. Preserve historical wording only when a document is clearly describing past behavior rather than the current public contract.

### Rationale
- Runtime registration in `apps/az-mcp/src/server.ts` is the source of truth for the public tool catalog.
- `apps/az-mcp/src/__tests__/server.test.ts` is the highest-signal validation surface because it asserts discovery and invocation names directly.
- Existing specs, contracts, quickstarts, and tasks are repo-owned guidance surfaces that users and contributors rely on for canonical examples.
- Limiting updates to canonical-name references avoids unnecessary churn in internal helpers or unrelated historical prose.

### Alternatives considered
- Updating only `server.ts`: rejected because tests and guidance would immediately become inconsistent.
- Bulk-replacing every matching string in the repository: rejected because some references may be historical or generated rather than canonical guidance.

---

## 4. Future guidance mechanism

### Decision
Use workspace-shared Copilot skills under `.github/skills` as the durable mechanism for future Azure MCP naming guidance.

### Rationale
- The repository already uses `.github` for shared Copilot customizations, and skills are the right primitive for reusable workflow guidance.
- Skills can be written narrowly around Azure MCP naming and rollout tasks without forcing those instructions into every unrelated session.
- The newly added naming and rollout skills directly match the future implementation and review scenarios for this feature.

### Alternatives considered
- Encoding the naming rule only in a feature spec: rejected because future contributors would have to rediscover the rule manually.
- Putting the entire rule in always-on repo instructions: rejected because it would add unnecessary global context for unrelated tasks.

---

## 5. Generated output handling

### Decision
Treat `apps/az-mcp/dist/**` as generated output that should be refreshed by the normal build after source changes rather than edited as a source-of-truth surface during implementation.

### Rationale
- Source files under `apps/az-mcp/src/**` are the authoritative implementation surfaces.
- Editing generated files by hand would create avoidable drift and complicate validation.
- A rebuild after the runtime rename is the simplest way to keep generated artifacts aligned if they are tracked.

### Alternatives considered
- Manually patching generated files alongside source changes: rejected because it duplicates work and increases the risk of mismatches.
- Ignoring generated outputs completely: rejected because tracked build artifacts can still appear stale after the source rename.