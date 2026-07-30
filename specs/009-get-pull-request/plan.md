# Implementation Plan: Get Pull Request for Review

**Branch**: `009-get-pull-request` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

## Summary

Add `az_get_pull_request` to az-mcp. The tool accepts a PR ID or Azure DevOps PR URL and returns metadata plus paginated review-ready file changes (text content/diffs, with explicit omission for binary/oversized files).

## Technical Approach

1. **Integration (`@hrms/azure-devops`)**
   - Parse `pullRequest` as positive integer or HTTPS URL (`dev.azure.com` / `*.visualstudio.com`).
   - Reject URLs whose organization does not match `AZURE_DEVOPS_ORG_URL`.
   - Resolve PR via `getPullRequestById` (ID path, configured project) or `getPullRequest` (URL path with repo).
   - Load latest iteration, then cumulative iteration changes with `compareTo=0`, applying `top`/`skip`.
   - For each page entry: resolve change kind, paths, `getFileDiffs`, and base/current text via `getItem`/`getItemContent` at target/source commits.
   - Bound text payloads; mark binary/oversized omissions.

2. **MCP (`apps/az-mcp`)**
   - Register `az_get_pull_request` with Zod inputs: `pullRequest` (string|number), optional `top`/`skip`.
   - Thin handler serializes JSON success / `isError` failure.

3. **Docs / contracts**
   - Update CLAUDE.md tool list and feature MCP contract.

## File Impact

| File | Change |
|------|--------|
| `packages/integrations/azure-devops/src/types.ts` | New request/response types |
| `packages/integrations/azure-devops/src/pull-request-detail.ts` | New lookup + URL parse + change hydration |
| `packages/integrations/azure-devops/src/index.ts` | Export new API |
| `packages/integrations/azure-devops/src/__tests__/pull-request-detail.test.ts` | Integration tests |
| `apps/az-mcp/src/tools/get-pull-request.ts` | Handler |
| `apps/az-mcp/src/server.ts` | Register tool |
| `apps/az-mcp/src/__tests__/tools/get-pull-request.test.ts` | Handler tests |
| `apps/az-mcp/src/__tests__/server.test.ts` | Catalog/schema/call-through |
| `CLAUDE.md` | Tool inventory |

## Defaults

| Setting | Value |
|---------|-------|
| Default `top` | 50 |
| Max `top` | 100 |
| Default `skip` | 0 |
| Max text bytes per side | 100_000 |
| Cumulative compare baseline | iteration `0` |
