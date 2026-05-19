# Quickstart: Work Item Pull Request Hash Collection

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## Goal

Verify that the MCP server can discover PRs linked to multiple work items and their immediate child Tasks or Issues, pause for user refinement, and then return the final PR hash list with total counts.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm 10+
- Azure DevOps PAT with work item and repository read access
- Valid values for `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, and `AZURE_DEVOPS_TOKEN`

## 1. Install dependencies

From the repository root:

```bash
npm install
```

## 2. Run focused tests first

```bash
npm run test --workspace=packages/integrations/azure-devops -- pull-requests
npm run test --workspace=apps/az-mcp -- src/__tests__/tools/get-work-item-pull-requests.test.ts src/__tests__/server.test.ts
```

Expected new test coverage:
- requested work items plus immediate child Task or Issue traversal
- PR artifact parsing and repository-scoped deduplication
- staged refinement responses when no filters are supplied
- author, target-branch, and status filtering
- merged-date and fallback PR-ID sorting
- final total counts and hash extraction
- work-item issue reporting without dropping valid PR results

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

## 5. Exercise the tool in two stages

Initial discovery call:

> Get pull requests for work items 123,456,789

Expected staged response characteristics:
- `stage` is `needs_refinement`
- `candidateTotal` reports the total discovered PRs before filtering
- `facets.authors`, `facets.targetBranches`, and `facets.statuses` list the available choices
- `questions` asks which authors, target branches, statuses, and sort field the user wants
- `results` is `null`

Follow-up refinement call after the user answers:

> Get pull requests for work items 123,456,789 filtered to authors Alice and Bob, target branch main, status completed, sorted by merged date descending

Expected final response characteristics:
- `stage` is `complete`
- `candidateTotal` shows the full discovered set
- `matchingTotal` shows the filtered total displayed to the user
- `results[]` contains one entry per unique PR with related work-item traceability
- each PR includes `hashes.mergeCommit`, `hashes.sourceCommit`, and `hashes.targetCommit` when Azure DevOps provides them

Unfiltered finalization path:

> Get pull requests for work items 123,456,789 and skip filtering

Expected behavior:
- the tool returns `stage = complete`
- all discovered PRs are returned in deterministic order
- the response still includes `candidateTotal` and `matchingTotal`

## 6. Performance verification

Use a representative request with up to 25 top-level work item IDs and confirm:
- requested work items are fetched in batch
- child work items are deduplicated before fetch
- linked PR references are deduplicated before hydration
- the first-stage candidate response completes within the feature target of 10 seconds under normal network conditions
- follow-up filtering adds no extra Azure DevOps calls beyond the initial candidate hydration set

Recorded implementation validation on 2026-05-18:
- Focused tests passed for `packages/integrations/azure-devops/src/__tests__/pull-requests.test.ts`, `apps/az-mcp/src/__tests__/tools/get-work-item-pull-requests.test.ts`, and `apps/az-mcp/src/__tests__/server.test.ts`.
- `npm run build --workspace=packages/integrations/azure-devops` passed.
- `npm run build --workspace=apps/az-mcp` passed.
- A live Azure performance smoke run was not executed during implementation, so real-environment latency still needs verification against configured credentials.

## 7. MCP integration notes

- The new tool should be registered as `az_get_work_item_pull_requests`.
- The first-stage response is intentionally not the final hash list; it exists so the agent can ask the user which authors, target branches, statuses, and sort field to apply.
- The final response must always show the total number of PRs returned after filtering, and it should preserve the total candidate count discovered before filtering.