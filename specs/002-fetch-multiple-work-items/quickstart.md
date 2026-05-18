# Quickstart: Multiple Work Item Retrieval

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## Goal

Verify that the MCP server can retrieve multiple Azure DevOps work items efficiently from one comma-separated request while preserving current single-item behavior.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm 10+
- Azure DevOps PAT with Work Items read access
- Valid values for `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, and `AZURE_DEVOPS_TOKEN`

## 1. Install dependencies

From the repository root:

```bash
npm install
```

## 2. Run focused tests first

```bash
npm run test --workspace=packages/integrations/azure-devops -- work-items
npm run test --workspace=apps/az-mcp -- src/__tests__/tools/get-work-items.test.ts src/__tests__/server.test.ts
```

Expected coverage from the new tests:
- comma-separated parsing with whitespace support
- preserved result order
- duplicate IDs fetched once but returned in requested order
- mixed valid and invalid IDs
- over-limit rejection
- unchanged single-item retrieval behavior

## 3. Build the touched packages

```bash
npm run build --workspace=packages/integrations/azure-devops
npm run build --workspace=apps/az-mcp
```

## 4. Start the MCP server

```bash
npm run build --workspace=apps/az-mcp
npm run start --workspace=apps/az-mcp
```

## 5. Exercise the MCP tools

Single-item regression check:

> Get work item 1234

Multi-item request:

> Get work items 1,2, 3,4

Mixed-result request:

> Get work items 1,9999, abc, 3

Expected multi-item characteristics:
- successful items are returned in request order
- the response includes `requestedCount`, `successCount`, `issueCount`, and ordered `results`
- each `results[]` entry reports one of `found`, `invalid`, `not_found`, or `inaccessible`
- invalid and missing entries include item-specific feedback
- the request does not fail wholesale because one ID is bad

Expected validation messages:
- empty input -> `Provide at least one work item ID`
- more than 25 parsed IDs -> `A maximum of 25 work item IDs is supported per request`

## 6. Performance verification

Use a representative set of up to 25 valid IDs and confirm:
- the initial fetch path uses one Azure DevOps batch request for valid IDs
- omitted IDs trigger only limited follow-up classification calls
- responses complete within the feature target of 5 seconds under normal network conditions

Recorded smoke result on 2026-05-18 using the local `apps/az-mcp/.env` Azure DevOps configuration:
- 25 requested IDs
- 25 successful results
- 0 issue results
- 2343 ms total retrieval time
- 1 `queryByWiql` call to obtain recent IDs for the probe
- 1 `getWorkItemsBatch` call for the multi-item fetch
- 0 fallback `getWorkItem` calls

Tuning notes from the live probe:
- Azure DevOps batch retrieval must not combine the `fields` parameter with `$expand`; that request shape fails with `The expand parameter can not be used with the fields parameter`.
- The supported batch shape for this feature is `getWorkItemsBatch({ ids, $expand: Relations, errorPolicy: Omit })`, which still returns the field data needed for mapping plus attachment relations.
- For large projects, the smoke probe should obtain candidate IDs with `queryByWiql(..., top: 25)` so Azure limits the result set server-side before the multi-item fetch begins.

## 7. MCP integration notes

- Keep `get_work_item` unchanged for existing callers.
- Use `get_work_items` for comma-separated ID retrieval.
- Resource URIs remain unchanged because this feature only extends tool-based retrieval.