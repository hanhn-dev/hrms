---
name: az-mcp-tool-rollout
description: "Use when planning or implementing Azure DevOps MCP tool changes that affect public names. Helps contributors propagate az_ naming consistently across repository guidance and validation surfaces instead of changing only the primary registration point."
---

# Az MCP Tool Rollout

## Use This Skill When

- Planning a feature that introduces or renames Azure DevOps MCP tools.
- Implementing a public Azure DevOps MCP tool rename.
- Checking whether follow-on updates for an Azure MCP tool change were missed.

## Workflow

- Identify every public Azure DevOps MCP tool name touched by the change.
- Confirm the canonical tool name follows the `az_` prefix convention.
- Check `apps/az-mcp/src/server.ts` first so rollout work follows the actual runtime catalog rather than stale examples.
- Update repository-owned references that present, validate, or demonstrate the renamed tool.
- Verify the final tool catalog and the surrounding guidance agree on the same canonical names.

## Review Questions

- Does each affected public Azure DevOps MCP tool name begin with `az_`?
- Are outdated unprefixed canonical references removed or intentionally preserved for a documented reason?
- Can a future contributor learn the naming rule and impacted surfaces from repository guidance alone?