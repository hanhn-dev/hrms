# Implementation Plan: Aggregate Work Item Context

**Branch**: `007-concat-workitem-context` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-concat-workitem-context/spec.md`

## Summary

Add a new Azure DevOps MCP tool, `az_get_work_item_hierarchy_context`, that returns one AI-oriented JSON payload for a root work item plus all readable descendant work items. The shared Azure DevOps integration will reuse the existing recursive `Hierarchy-Forward` traversal pattern, aggregate each work item's Description and Acceptance Criteria as Markdown, expose image attachments as metadata plus existing `azdo://workitem/{id}/images/{attachmentId}` resource URIs, and preserve partial results through explicit omission notices whenever descendants or attachment metadata cannot be included.

## Technical Context

**Language/Version**: TypeScript 6.x with strict mode; Node.js 22.18+ for repo build workflows and Node.js 20.19+ or 22.12+ for the bundled MCP runtime  
**Primary Dependencies**: `@modelcontextprotocol/sdk@1.29.0`, `azure-devops-node-api@15.1.2`, `zod@4.4.3`, existing `@hrms/azure-devops` HTML-to-Markdown and work-item mapping utilities  
**Storage**: N/A - the tool is read-only and fetches work-item data live from Azure DevOps APIs  
**Testing**: Vitest unit and integration tests in `packages/integrations/azure-devops` and `apps/az-mcp`  
**Target Platform**: Node.js stdio MCP server consumed by clients such as VS Code Copilot Agent or Claude Desktop  
**Project Type**: Existing monorepo MCP server app (`apps/az-mcp`) plus shared Azure DevOps integration package (`packages/integrations/azure-devops`)  
**Performance Goals**: A typical hierarchy lookup for one root item and its readable descendants should complete in one MCP round-trip without follow-up calls, and normal-condition responses for moderate hierarchies should remain within the same practical latency envelope as the existing pull-request hierarchy lookup  
**Constraints**: Read-only behavior only; tool input is a single positive work-item ID; traversal must include the full descendant tree discovered through `System.LinkTypes.Hierarchy-Forward`; each readable work item may appear at most once; non-image attachments are excluded; root lookup failure is a hard error; descendant or attachment-metadata failures must surface as omission notices instead of aborting the whole response; returned image context uses resource URIs rather than inline binary payloads; public tool naming must follow the canonical `az_` prefix  
**Scale/Scope**: One new public Azure DevOps MCP tool, one aggregated response model in the shared integration package, targeted test additions in two packages, and contract and quickstart documentation for the new tool while reusing the existing image resource

## Constitution Check

*GATE: Verified before Phase 0 research and re-verified after Phase 1 design.*

- [x] **I. TypeScript-First** — Planned changes stay in existing TypeScript packages and test suites, shared response shapes remain in `packages/integrations/azure-devops/src/types.ts`, and new public functions and handlers will keep explicit return types.
- [x] **II. Functional Programming** — Hierarchy traversal, deduplication, context shaping, missing-field flags, and omission aggregation can remain pure transformations; Azure DevOps calls and resource reads stay isolated to the existing client and MCP server boundaries.
- [x] **III. Test-First** — The plan requires failing tests first for deep descendant inclusion, per-item traceability, omission handling, image filtering and URI shaping, tool registration, and handler serialization before implementation begins.
- [x] **IV. UX Consistency** — No visual UI surface changes are introduced; consistency work is limited to a predictable MCP JSON payload and reuse of the existing `azdo://workitem/{id}/images/{attachmentId}` image-resource contract.
- [x] **V. Performance by Design** — Browser performance budgets are N/A; server-side performance is preserved by batch work-item reads, descendant deduplication, reuse of mapped work-item fields, and avoiding inline image blobs in the tool response.

## Project Structure

### Documentation (this feature)

```text
specs/007-concat-workitem-context/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mcp-tools.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/
└── integrations/
    └── azure-devops/
        └── src/
            ├── index.ts
            ├── types.ts
            ├── work-items.ts
            └── __tests__/
                └── work-items.test.ts

apps/
└── az-mcp/
    └── src/
        ├── server.ts
        ├── tools/
        │   └── get-work-item-hierarchy-context.ts
        └── __tests__/
            ├── server.test.ts
            └── tools/
                └── get-work-item-hierarchy-context.test.ts
```

**Structure Decision**: Keep the aggregation logic in the existing work-item integration surface because the feature is a work-item-centric read model rather than a new domain like pull requests. The shared package owns descendant traversal, work-item aggregation, omission shaping, and exported response types. The `apps/az-mcp` package remains a thin MCP shell that registers the new `az_` tool, validates the singular `id` input, and serializes the shared response.

## Complexity Tracking

> No constitution violations. The design stays within the current package boundaries and reuses the existing image resource instead of introducing a second binary-delivery path.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
