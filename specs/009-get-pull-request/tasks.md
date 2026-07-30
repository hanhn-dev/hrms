# Tasks: Get Pull Request for Review

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1 — Contract

- [x] T001 Write MCP tool contract in `contracts/mcp-tools.md`
- [x] T002 Write/validate feature `spec.md` and quality checklist

## Phase 2 — Integration

- [x] T003 Add pull request detail types to `packages/integrations/azure-devops/src/types.ts`
- [x] T004 Implement URL/ID parsing and `getPullRequestDetail` in `packages/integrations/azure-devops/src/pull-request-detail.ts`
- [x] T005 Export new API from `packages/integrations/azure-devops/src/index.ts`
- [x] T006 Add unit tests in `packages/integrations/azure-devops/src/__tests__/pull-request-detail.test.ts`

## Phase 3 — MCP

- [x] T007 Add `apps/az-mcp/src/tools/get-pull-request.ts` handler
- [x] T008 Register `az_get_pull_request` in `apps/az-mcp/src/server.ts`
- [x] T009 Add handler tests and update `server.test.ts` catalog/schema coverage
- [x] T010 Update `CLAUDE.md` tool inventory

## Phase 4 — Verify

- [x] T011 Run focused Vitest suites for `@hrms/azure-devops` and `apps/az-mcp`
- [x] T012 Lint and build touched workspaces

### Verification notes

- `@hrms/azure-devops` build + `pull-request-detail` / `pull-requests` tests: passed (20 tests)
- `az-mcp` build + `get-pull-request` handler tests: passed (3 tests)
- `az-mcp` `server.test.ts` cannot run in this environment due to a pre-existing `ajv@6` override conflicting with `ajv-formats@3` (needs `ajv@8`); catalog/schema assertions were still added to the file
- Workspace lint is currently broken repo-wide (missing `eslint.config.*`); TypeScript `--noEmit` for both touched packages passed
