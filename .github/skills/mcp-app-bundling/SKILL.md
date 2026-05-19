---
name: mcp-app-bundling
description: "Use when adding, replacing, or reviewing build tooling for MCP apps in this repo. Enforces the tsdown-based bundling contract, stable dist/index.js runtime artifacts, and the rollout surfaces that must stay aligned."
---

# MCP App Bundling

## Use This Skill When

- Replacing or upgrading build tooling for an MCP app under `apps/`.
- Reviewing whether an MCP app still follows the repo bundling contract.
- Updating root scripts or maintainer docs that execute MCP app runtime artifacts.

## Required Contract

- MCP apps with repository-owned runtime artifacts use `tsdown` with an app-local `tsdown.config.ts`.
- The default runtime artifact stays at `dist/index.js` unless a planned migration explicitly changes it.
- App-level `build`, `start`, and `inspect` scripts must agree on the runtime artifact path.
- Root maintainer workflows such as `inspect:*` must follow the implemented app bundle contract instead of relying on redundant prebuild drift.
- Runtime-sensitive dependencies should stay external when bundling them would weaken reliability.

## Surfaces To Update

- App package manifests and app-local bundler config.
- Root workspace scripts that build or inspect the affected MCP app.
- Focused build-contract tests for the affected app.
- Maintainer-facing quickstarts or READMEs that describe build and inspect flows.
- `.specify/memory/constitution.md` and `.github/copilot-instructions.md` when repo-level policy or guidance changes.

## Completion Standard

- The app builds through `tsdown` and emits the documented `dist/index.js` artifact.
- Focused build-contract tests pass for package-level and root-level workflows.
- Documentation and repo guidance describe the same build-host Node requirement and rollout surfaces as the implementation.