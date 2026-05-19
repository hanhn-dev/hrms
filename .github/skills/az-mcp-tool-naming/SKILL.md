---
name: az-mcp-tool-naming
description: "Use when adding, renaming, or reviewing Azure DevOps MCP tools in this repo. Enforces the public naming convention az_<snake_case_tool_name> and checks tool registration, tests, docs, prompts, contracts, and examples for consistent canonical names."
---

# Az MCP Tool Naming

## Use This Skill When

- Adding a new Azure DevOps MCP tool.
- Renaming an existing public Azure DevOps MCP tool.
- Reviewing whether Azure DevOps MCP tool references are consistent.

## Required Convention

- Every public Azure DevOps MCP tool exposed by this repository uses the `az_` prefix.
- Keep the remainder of the tool name in descriptive snake_case.
- Treat the prefixed name as the canonical name in all user-facing references.
- Current canonical examples are `az_get_work_item`, `az_get_work_items`, `az_get_work_item_pull_requests`, `az_list_work_items`, and `az_query_work_items`.
- `apps/az-mcp/src/server.ts` is the runtime source of truth for the public Azure DevOps MCP tool catalog.

## Surfaces To Check

- Public tool registration and discovery output.
- Tool invocation and registration tests.
- Repository documentation, contracts, prompts, plans, and examples that mention tool names.
- Any checklist or validation artifact that asserts specific public tool names.

## Completion Standard

- Renamed or new Azure DevOps tools are exposed with `az_` names.
- Canonical examples and validation assets use the prefixed names.
- Any explicit backward-compatibility decision is stated instead of assumed.