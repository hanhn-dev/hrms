# Feature Specification: Standardize MCP App Bundling

**Feature Branch**: `[006-add-tsdown-bundling]`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "add `tsdown` with latest version for bundling the mcp apps. Also update the relevant skills and constitution documents."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build And Launch Bundled MCP Apps (Priority: P1)

A maintainer can build the Azure DevOps MCP app and the database MCP app into runnable distributable artifacts, then start or inspect those apps without manually rebuilding their runtime layout.

**Why this priority**: The feature has no value unless both targeted MCP apps can be bundled into working runtime artifacts that preserve their current launch expectations.

**Independent Test**: From a clean workspace, build each targeted MCP app through its documented workflow, then start or inspect each app from the produced runtime artifact without manual file moves or command rewrites.

**Acceptance Scenarios**:

1. **Given** a clean workspace with dependencies installed, **When** a maintainer builds the Azure DevOps MCP app, **Then** the build produces a runnable bundled artifact for that app in the expected distribution location.
2. **Given** a clean workspace with dependencies installed, **When** a maintainer builds the database MCP app, **Then** the build produces a runnable bundled artifact for that app in the expected distribution location.
3. **Given** a bundled MCP app artifact has been produced, **When** a maintainer runs the documented start or inspection workflow, **Then** the app launches from the bundled output without additional packaging steps.

---

### User Story 2 - Keep Build Workflows Consistent Across Both Apps (Priority: P2)

A maintainer can use a consistent build contract for both MCP apps so workspace scripts, local validation, and app-specific commands do not drift apart.

**Why this priority**: Bundling only helps long-term if both app packages and workspace-level commands agree on how artifacts are built and where they are consumed.

**Independent Test**: Review and execute the app-level and workspace-level build and inspection commands for both targeted MCP apps and verify they follow the same bundling pattern and resolve the expected artifacts.

**Acceptance Scenarios**:

1. **Given** a maintainer uses the app-level build command for either targeted MCP app, **When** the build finishes, **Then** the resulting artifact path matches the path used by that app's runtime commands.
2. **Given** a maintainer uses workspace-level convenience commands for the targeted MCP apps, **When** those commands run after the bundling change, **Then** they resolve the correct bundled artifacts for both apps.
3. **Given** both targeted MCP apps share the same bundling standard, **When** a reviewer compares their package-level build setup, **Then** the build behavior is consistent enough to understand and validate without app-specific exceptions.

---

### User Story 3 - Preserve The Bundling Standard In Repository Guidance (Priority: P3)

A contributor can discover the approved MCP app bundling standard and the required rollout surfaces from repository guidance so future build-tool changes do not reintroduce drift.

**Why this priority**: The immediate build change will regress over time unless the repository guidance teaches contributors which MCP apps follow the standard and which documents must stay aligned.

**Independent Test**: Review the relevant contributor skills and constitution guidance and verify they describe the MCP app bundling standard, its scope, and the follow-on surfaces that must be updated when the standard changes.

**Acceptance Scenarios**:

1. **Given** a contributor plans a future MCP app build-tool change, **When** they consult the repository guidance, **Then** they can identify the approved bundling standard and the targeted MCP apps it applies to.
2. **Given** a contributor updates the MCP app bundling approach in the future, **When** they follow the documented guidance, **Then** they are directed to update both build commands and the relevant governance artifacts rather than only one package manifest.

---

### Edge Cases

- One targeted MCP app produces a bundled artifact while the other still depends on a different build contract, creating inconsistent runtime expectations across the workspace.
- A bundling change moves or renames the runtime artifact so existing start or inspection workflows point to a stale path.
- A bundled output omits dependencies or entry behavior that the current runtime workflows rely on.
- Contributor guidance is updated in one place but not the other, leaving the repository with conflicting statements about the approved MCP app build standard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a bundled production build workflow for the Azure DevOps MCP app and the database MCP app.
- **FR-002**: The system MUST keep the runtime artifact path for each targeted MCP app predictable enough that existing start and inspection workflows can resolve the bundled output without manual intervention.
- **FR-003**: The system MUST preserve the current runtime behavior of both targeted MCP apps after the bundling change, aside from replacing the underlying build approach.
- **FR-004**: The system MUST allow each targeted MCP app to be built independently through its package-level workflow.
- **FR-005**: The system MUST keep workspace-level build and inspection commands aligned with the bundled outputs for both targeted MCP apps.
- **FR-006**: The system MUST apply one approved bundling standard consistently across both targeted MCP apps rather than leaving each app on a different build contract.
- **FR-007**: The system MUST update repository guidance that teaches contributors how MCP app build-tool changes should be applied and reviewed.
- **FR-008**: The system MUST update the repository constitution when the approved MCP app build standard or its required quality gates change as part of this feature.
- **FR-009**: The feature MUST remain scoped to the Azure DevOps MCP app, the database MCP app, the relevant contributor skills, and the constitution guidance unless another change is strictly required to keep those surfaces aligned.

### Key Entities *(include if feature involves data)*

- **MCP App Build Contract**: The agreed build behavior for a targeted MCP app, including how maintainers invoke the build and which runtime artifact downstream commands consume.
- **Bundled Runtime Artifact**: The packaged executable output produced for a targeted MCP app and used by start or inspection workflows.
- **Bundling Guidance Artifact**: A repository-maintained instruction source, such as a contributor skill or constitutional rule, that explains the approved MCP app bundling standard and its rollout expectations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a clean workspace, both targeted MCP apps can each be built into runnable bundled artifacts on the first documented attempt.
- **SC-002**: 100% of documented start and inspection workflows for the targeted MCP apps resolve their expected runtime artifacts without manual path fixes after the bundling change.
- **SC-003**: A reviewer can confirm within 5 minutes, using repository guidance alone, which MCP apps follow the shared bundling standard and which governance artifacts must stay in sync when that standard changes.
- **SC-004**: No targeted MCP app requires a separate undocumented build exception to produce or consume its distributable runtime artifact.

## Assumptions

- The feature applies only to the existing MCP application packages in the repository and does not change the build strategy for unrelated apps or shared integration packages.
- The distributed runtime entry for each targeted MCP app remains stable enough that existing MCP client configuration patterns do not need a separate migration feature.
- The requested bundling dependency will be pinned according to the repository's dependency policy at implementation time.
- Public MCP tool names, schemas, and behaviors remain unchanged by this feature.