# MCP Tool Contract: Azure DevOps az_ Naming Catalog

**Phase**: 1 - Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-18

This document defines the canonical public MCP tool names for the Azure DevOps tool catalog after the rename. Tool behavior, inputs, and outputs remain unchanged unless noted otherwise.

## Catalog rename contract

| Legacy name | Canonical name | Behavior change |
|-------------|----------------|-----------------|
| `get_work_item` | `az_get_work_item` | None |
| `get_work_items` | `az_get_work_items` | None |
| `get_work_item_pull_requests` | `az_get_work_item_pull_requests` | None |
| `list_work_items` | `az_list_work_items` | None |
| `query_work_items` | `az_query_work_items` | None |

## Discovery contract

- MCP tool discovery returns the canonical `az_`-prefixed names for the Azure DevOps tool catalog.
- The unprefixed names are not part of the canonical public contract for this feature.
- Tool descriptions remain equivalent to the current catalog apart from name normalization.

## Invocation contract

### `az_get_work_item`

Retrieves a single Azure DevOps work item by ID.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | integer | Yes | positive integer | Azure DevOps work item ID |

### `az_get_work_items`

Retrieves multiple Azure DevOps work items from a comma-separated list of IDs while preserving input order and reporting per-item issues.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `ids` | string | Yes | non-empty string | Comma-separated work item IDs |

### `az_get_work_item_pull_requests`

Retrieves pull requests linked to Azure DevOps work items and their qualifying descendants, returning either staged refinement prompts or the final PR summary.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `ids` | string | Yes | non-empty string | Comma-separated top-level work item IDs |
| `authors` | string[] | No | non-empty values | Optional author filters |
| `targetBranches` | string[] | No | non-empty values | Optional target branch filters |
| `statuses` | string[] | No | non-empty values | Optional PR status filters |
| `sortBy` | string | No | `mergedDate` or `pullRequestId` | Final response sort field |
| `sortDirection` | string | No | `asc` or `desc` | Final response sort direction |
| `confirmUnfiltered` | boolean | No | boolean | Explicitly finalize without filters |

### `az_list_work_items`

Lists Azure DevOps work items with optional filters.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `project` | string | No | non-empty string | Override project scope |
| `type` | string | No | non-empty string | Work item type filter |
| `state` | string | No | non-empty string | Work item state filter |
| `iteration` | string | No | non-empty string | Iteration path filter |
| `top` | integer | No | 1 to 200 | Maximum item count; defaults to 50 when omitted |

### `az_query_work_items`

Executes a WIQL query and returns matching work item summaries.

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `wiql` | string | Yes | non-empty string | WIQL query text |
| `top` | integer | No | 1 to 200 | Maximum item count; defaults to 50 when omitted |

## Compatibility note

- This feature defines the prefixed names as the canonical contract.
- Any compatibility alias for the legacy names would require a separate feature and separate validation coverage.

## Guidance artifacts

- Future naming guidance is reinforced by `.github/skills/az-mcp-tool-naming/SKILL.md`.
- Rollout guidance for public-name changes is reinforced by `.github/skills/az-mcp-tool-rollout/SKILL.md`.