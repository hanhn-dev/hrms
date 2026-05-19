# Contract: MCP App Bundling And Runtime Artifacts

**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-19

## Scope

This contract defines the maintainer-facing build and runtime artifact expectations for the MCP apps covered by this feature.

## Bundling targets

### `apps/az-mcp`

- Build workflow remains invocable through the app package `build` script.
- The build emits a runnable Node ESM artifact at `apps/az-mcp/dist/index.js`.
- The package `start` and `inspect` workflows consume that same artifact.
- The app bundle may inline the internal Azure DevOps workspace package so the runtime artifact does not depend on a separate app-specific prebuild step for that package.

### `apps/db-mcp`

- Build workflow remains invocable through the app package `build` script.
- The build emits a runnable Node ESM artifact at `apps/db-mcp/dist/index.js`.
- The package `start` and `inspect` workflows consume that same artifact.
- The app bundle may inline the internal database-inspector workspace package source, but runtime-sensitive database drivers remain external runtime dependencies.

## Root command expectations

### `inspect:az`

- Must launch the bundled `apps/az-mcp/dist/index.js` artifact.
- Must keep the current env-file driven startup contract.
- Must not require an undocumented prebuild outside the app build workflow.

### `inspect:db`

- Must launch the bundled `apps/db-mcp/dist/index.js` artifact.
- Must keep the current env-file driven startup contract.
- Must not require a redundant prebuild of the shared database-inspector package purely for the app runtime if the app bundle already resolves that code.

## Build-tool policy

- The targeted MCP apps adopt `tsdown` as the approved bundler for this feature.
- The pinned `tsdown` version is `0.22.0`.
- Build-time Node requirements introduced by `tsdown` must be reflected in repository governance and contributor guidance.

## Implemented root workflow expectations

- `inspect:az` builds `apps/az-mcp` first, then launches the inspector against `apps/az-mcp/dist/index.js`.
- `inspect:db` builds `apps/db-mcp` first, then launches the inspector against `apps/db-mcp/dist/index.js`.
- `inspect:db` does not prebuild `packages/integrations/database-inspector` as a separate runtime prerequisite.

## Validation contract

Implementation is complete only when all of the following are true:

- Both target app build scripts succeed using the approved bundler.
- Both target app runtime workflows execute the artifact path documented here.
- Focused regression tests for the two MCP apps still pass after the build-tool change.
- Contributor guidance and governance artifacts describe the same bundling rule and rollout surfaces as the implementation.
