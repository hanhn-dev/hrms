# Data Model: Standardize MCP App Bundling

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-19

## Entities

### BundlingTarget

Represents one MCP app package that adopts the shared bundling standard.

| Field | Type | Description |
|-------|------|-------------|
| `packageName` | `string` | Workspace package name for the target app |
| `packagePath` | `string` | Relative path to the app package |
| `entryFile` | `string` | Source entry file bundled for runtime |
| `runtimeArtifact` | `string` | Output artifact consumed by start and inspect workflows |
| `runtimeCommands` | `readonly string[]` | Commands that execute the bundled output |
| `internalWorkspaceDependency` | `string \| null` | Internal workspace package that may be resolved into the bundle |
| `externalRuntimeDeps` | `readonly string[]` | Dependencies intentionally left external at runtime |

Validation rules:
- `runtimeArtifact` must stay stable enough for downstream start and inspect workflows to consume without ad hoc path changes.
- Every `runtimeCommands` entry must resolve the same artifact contract that the package-level build produces.
- `externalRuntimeDeps` must only include dependencies whose runtime behavior should remain installed and resolved outside the bundle.

---

### AppBundlingConfig

Represents the app-local bundling configuration that defines how a `BundlingTarget` is built.

| Field | Type | Description |
|-------|------|-------------|
| `configPath` | `string` | Location of the app-local `tsdown` configuration file |
| `format` | `"esm"` | Module format for the bundled app output |
| `platform` | `"node"` | Runtime platform targeted by the bundle |
| `targetRuntime` | `string` | Lowest Node runtime compatibility target for emitted code |
| `outDir` | `string` | Output directory for bundled artifacts |
| `preserveJsEntry` | `boolean` | Whether the configuration preserves a `.js` runtime entry |
| `cleanOutput` | `boolean` | Whether the output directory is cleaned before build |
| `sourceMapMode` | `"none" \| "external" \| "inline"` | Source-map behavior for emitted files |

Validation rules:
- `format` and `platform` must match the MCP app's Node-based runtime contract.
- `preserveJsEntry` must remain true while start and inspection commands continue to target `dist/index.js`.
- `targetRuntime` must not require a higher runtime floor than the repo intends to support for executing the MCP apps.

---

### WorkspaceCommandContract

Represents a maintainer-facing command that must remain aligned with the new bundling behavior.

| Field | Type | Description |
|-------|------|-------------|
| `owner` | `"root" \| "app"` | Whether the command lives in the root workspace or an app package |
| `commandName` | `string` | Script name or documented command identifier |
| `buildInputs` | `readonly string[]` | Packages or artifacts the command expects to exist |
| `artifactPath` | `string` | Runtime artifact path used by the command |
| `purpose` | `"build" \| "start" \| "inspect" \| "validate"` | Primary workflow supported by the command |

Validation rules:
- `build` commands must produce the artifact expected by paired `start` or `inspect` commands.
- Root and app command contracts for the same target must agree on the artifact path.
- Commands should not depend on undocumented prebuild steps once the bundling standard is applied.

---

### GuidanceArtifact

Represents a repository-maintained instruction source that teaches or governs the bundling standard.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | File path of the guidance artifact |
| `kind` | `"constitution" \| "skill" \| "quickstart" \| "readme" \| "plan-reference"` | Guidance category |
| `audience` | `"contributor" \| "reviewer" \| "maintainer"` | Primary reader |
| `scope` | `readonly string[]` | App packages or workflows covered by the guidance |
| `mustDescribe` | `readonly string[]` | Required rules or rollout surfaces that the artifact must mention |

Validation rules:
- The constitution must describe any changed build-tool or Node-version requirement that becomes repo policy.
- The skill must explain both the bundling rule and the rollout surfaces that must stay aligned.
- Quickstarts and READMEs must reference the same command and artifact contract implemented by the packages.

## State Transitions

1. Inventory the current build and runtime command contracts for `apps/az-mcp` and `apps/db-mcp`.
2. Define an app-local `tsdown` config for each `BundlingTarget` that emits the expected runtime artifact.
3. Align each target app's package scripts and manifest fields with the bundled output.
4. Update root commands and documentation so they consume the new bundled contract consistently.
5. Record the bundling standard in repo guidance artifacts.
6. Validate that each target app still builds, starts, and inspects from the documented artifact path.

## Validation Rules Summary

| Rule | Description |
|------|-------------|
| Shared bundling standard | Both target MCP apps adopt the same bundler and a consistent build contract |
| Stable runtime entry | The runtime artifact remains predictable and matches documented commands |
| Internal-code bundling | App bundles absorb internal workspace code where that reduces prebuild coupling |
| Safe dependency externalization | Runtime-sensitive dependencies stay external where bundling would reduce reliability |
| Guidance alignment | Skills, constitution guidance, and workflow docs agree on the same build standard |
| Executable validation | The rollout is verified through build, test, and runtime smoke checks rather than documentation alone |
