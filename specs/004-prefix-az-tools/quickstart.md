# Quickstart: Prefix Azure MCP Tool Names

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## Goal

Verify that the Azure DevOps MCP tool catalog exposes the canonical `az_`-prefixed tool names, that renamed tools still execute the same behavior, and that the repository guidance for future work reflects the same naming rule.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm 10+
- Azure DevOps credentials configured for `apps/az-mcp/.env` when exercising live tool calls

## 1. Install dependencies

From the repository root:

```bash
npm install
```

## 2. Run focused MCP tests first

```bash
npm run test --workspace=apps/az-mcp -- src/__tests__/server.test.ts src/__tests__/tools/get-work-item.test.ts src/__tests__/tools/get-work-items.test.ts src/__tests__/tools/get-work-item-pull-requests.test.ts src/__tests__/tools/list-work-items.test.ts src/__tests__/tools/query-work-items.test.ts
```

Expected coverage after implementation:
- MCP discovery exposes only `az_`-prefixed Azure DevOps tool names
- server-level invocation paths call the expected handlers through the new canonical names
- individual tool handlers continue returning the same payload shapes and error handling behavior

## 3. Build the MCP app

```bash
npm run build --workspace=apps/az-mcp
```

## 4. Inspect the tool catalog

From the repository root:

```bash
npm run inspect:az
```

Expected discovery result:
- the Azure DevOps MCP catalog includes `az_get_work_item`, `az_get_work_items`, `az_get_work_item_pull_requests`, `az_list_work_items`, and `az_query_work_items`
- the legacy unprefixed names are not presented as canonical tools

## 5. Exercise a renamed tool

Using the MCP inspector or an MCP client, call:

```json
{
  "name": "az_get_work_item",
  "arguments": {
    "id": 135898
  }
}
```

Expected behavior:
- the tool returns the same work-item payload shape as before the rename
- no changes are required to the input schema beyond the tool name itself

## 6. Verify future guidance artifacts

Confirm the workspace skills exist and describe the canonical naming rule:
- `.github/skills/az-mcp-tool-naming/SKILL.md`
- `.github/skills/az-mcp-tool-rollout/SKILL.md`

Expected guidance:
- future Azure DevOps MCP tools use the `az_` prefix
- public-name changes require updates to runtime registration, validation surfaces, and repository guidance rather than isolated source edits