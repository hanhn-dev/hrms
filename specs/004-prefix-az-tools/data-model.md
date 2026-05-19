# Data Model: Prefix Azure MCP Tool Names

**Phase**: 1 - Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-18

## Entities

### AzureMcpToolCatalogEntry

Represents one public Azure DevOps MCP tool exposed by the server after the rename.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Canonical public tool name, expected to start with `az_` |
| `legacyName` | `string` | Previous unprefixed public name used before this feature |
| `description` | `string` | User-facing tool description shown in MCP discovery |
| `inputSchemaSource` | `string` | Source location for the tool's input schema in `apps/az-mcp/src/server.ts` |
| `handlerSurface` | `string` | Runtime handler path or registration surface used to execute the tool |

Validation rules:
- `name` must begin with `az_`.
- `legacyName` must match the pre-rename public identifier for the same tool.
- The rename must not change the tool's behavior, required inputs, or output contract.

---

### ToolRenameMapping

Represents one planned rename from an existing public tool name to its new canonical form.

| Field | Type | Description |
|-------|------|-------------|
| `oldName` | `string` | Existing public tool name |
| `newName` | `string` | Canonical `az_`-prefixed replacement |
| `status` | `'planned' \| 'implemented' \| 'validated'` | Rollout state for the rename |
| `behaviorChanged` | `boolean` | Whether anything beyond the public name changed |

Validation rules:
- `behaviorChanged` must remain `false` for this feature.
- Each `oldName` maps to exactly one `newName`.
- Each `newName` must be unique across the Azure DevOps MCP tool catalog.

---

### ToolReferenceSurface

Represents a repository-owned location that presents or validates a public Azure DevOps MCP tool name.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Repository-relative file path |
| `surfaceType` | `'runtime' \| 'test' \| 'contract' \| 'quickstart' \| 'task' \| 'spec' \| 'skill' \| 'generated'` | Kind of surface being updated or reviewed |
| `updateMode` | `'canonical' \| 'historical' \| 'generated'` | Whether the file should be updated for current canonical names, preserved as history, or refreshed through build |
| `toolNames` | `string[]` | Public tool names presented or validated by the surface |

Validation rules:
- `runtime` and `test` surfaces that assert public names must use the canonical `az_` names after implementation.
- `canonical` documentation surfaces must not present retired unprefixed names as current examples.
- `generated` surfaces are not manually edited; they are refreshed by build output.

---

### NamingGuidanceSkill

Represents a workspace-shared Copilot skill that preserves the naming convention for future work.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Skill file path under `.github/skills` |
| `name` | `string` | Skill frontmatter name |
| `triggerScope` | `string[]` | Types of tasks the skill is meant to support |
| `ruleSummary` | `string` | Human-readable description of the naming convention or rollout workflow |

Validation rules:
- Skill descriptions must clearly mention Azure DevOps MCP tools and the `az_` naming convention so they are discoverable.
- Skills must cover both the naming rule and the rollout surfaces affected by public renames.

## State Transitions

1. Inventory the existing unprefixed Azure DevOps MCP tool names and map each one to its canonical `az_` replacement.
2. Update the runtime tool catalog in `apps/az-mcp/src/server.ts` so discovery exposes only the prefixed names.
3. Update server-level and tool-level validation surfaces that assert or describe the public names.
4. Update canonical repository contracts, quickstarts, tasks, and related guidance that present the renamed tools.
5. Confirm workspace skills continue to describe the `az_` rule and rollout expectations for future work.
6. Rebuild generated output if tracked artifacts need to reflect the renamed source surfaces.

## Validation Rules Summary

| Rule | Description |
|------|-------------|
| Canonical prefix | Every public Azure DevOps MCP tool name begins with `az_` |
| One-to-one rename | Each existing public tool name maps to one unique prefixed successor |
| Behavior preservation | The rename does not change input or output behavior |
| Canonical surface coverage | Runtime, tests, and current repo-owned guidance stay in sync on the prefixed names |
| Skill discoverability | Workspace skills clearly describe the naming convention and rollout expectations |
| Generated artifact refresh | Tracked build artifacts are refreshed through build rather than hand-edited |