# Feature Spec: az-mcp investigation packet

**Date**: 2026-08-21
**Status**: Planned — do not implement until this spec is approved

## Problem

az-mcp returns thin Azure DevOps field projections. Agents investigating a bug or reviewing a PR still miss Repro Steps, comments, screenshots they can actually see, priority, and PR review threads. Existing TDG skills already bypass this server (Azure CLI for work items, Microsoft ADO MCP for PR comments).

## Goal

Make az-mcp the default source of Azure DevOps context for HRMS agents by returning an **investigation packet**: the fields a model needs to understand a work item or PR, plus explicit next-step hints, without becoming a generic ADO wrapper.

## In scope

1. Work-item packet: separate Repro Steps, wider DTO, comments tool, image tool that returns image content, `resourceUri` on attachments, `hints[]`.
2. PR review shape: unified diff by default; read-only PR threads with file/line anchors.
3. List/search: actionable summaries; structured search; WIQL kept as an escape hatch.
4. Tool routing: when-to-use descriptions and Zod `.describe()` on every parameter.

## Out of scope

- Write tools (add comment, reply, resolve, update work item, vote).
- Wiki, pipelines, test plans, boards, identity, search across org.
- Cloning `microsoft/azure-devops-mcp`.
- Custom process fields (`includeCustomFields`).
- Changing the cherry-pick / elicitation behaviour of `az_get_work_item_pull_requests`.
- MCP `structuredContent` / `prompts` (keep JSON text payloads).

## Success

An agent given a Bug ID can get Repro Steps, discussion, and screenshots from az-mcp alone. An agent given a PR ID can get a truncated unified diff and active review threads from az-mcp alone. List/search results are enough to pick the next `az_get_*` call. Microsoft’s ADO MCP is no longer required for those two read paths.

## Assumptions

- Additive JSON fields are acceptable; omitting `baseContent`/`currentContent` by default is an intentional breaking change for `az_get_pull_request`.
- Comments stay a separate tool so `az_get_work_item` does not add an extra ADO round-trip.
- `@Me` is supported in structured search as the string `"@Me"` (WIQL macro), not a resolved identity lookup.
