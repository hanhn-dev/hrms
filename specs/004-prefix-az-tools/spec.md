# Feature Specification: Prefix Azure MCP Tool Names

**Feature Branch**: `[004-prefix-az-tools]`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: User description: "put the prefix `az` before the tool names. For example, the name would change from `get_work_item` to `az_get_work_item`. Also create some skills to fulfill this convention for future implementation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover and Invoke Prefixed Tools (Priority: P1)

As an MCP user or agent, I want Azure DevOps tools to appear with a consistent `az_` prefix so I can immediately recognize them as Azure-specific capabilities and invoke the canonical names without ambiguity.

**Why this priority**: The public tool name is the user-facing contract. If the exposed names do not change first, the naming convention is not actually visible or enforceable.

**Independent Test**: List the available Azure DevOps MCP tools and verify each exposed tool name uses the `az_` prefix while the renamed tools remain invocable through their prefixed names.

**Acceptance Scenarios**:

1. **Given** an MCP client lists the Azure DevOps tools exposed by this workspace, **When** the list is returned, **Then** each public Azure DevOps tool name begins with `az_`.
2. **Given** a user follows an example for a renamed tool such as `az_get_work_item`, **When** they invoke that tool with valid inputs, **Then** they receive the same functional result they previously received from the unprefixed tool name.

---

### User Story 2 - See Consistent Canonical Names Everywhere (Priority: P2)

As a maintainer or user reading repository-owned guidance, I want all canonical references to Azure DevOps MCP tools to use the prefixed names so examples, contracts, and tests do not conflict with the exposed tool catalog.

**Why this priority**: Renaming the catalog without updating the surrounding references creates confusion, broken examples, and misleading validation assets.

**Independent Test**: Review the repository-owned examples, contracts, prompts, and validation assets that mention renamed Azure DevOps tools and verify they use the canonical prefixed names.

**Acceptance Scenarios**:

1. **Given** repository-maintained documentation or examples reference a renamed Azure DevOps MCP tool, **When** a maintainer reads that guidance, **Then** the canonical name shown is the prefixed form.
2. **Given** a validation artifact or regression test refers to a renamed Azure DevOps MCP tool, **When** the artifact is executed or reviewed, **Then** it asserts against the prefixed name rather than the retired unprefixed name.

---

### User Story 3 - Reuse the Naming Rule in Future Work (Priority: P3)

As a contributor using Copilot workflows in this repository, I want reusable skills that describe the Azure MCP naming rule so future tool work starts from the correct convention instead of repeating the same guidance manually.

**Why this priority**: The rename is only durable if future additions and refactors follow the same convention without relying on tribal knowledge.

**Independent Test**: Trigger the relevant workspace skill during a future Azure MCP tool task and verify it instructs contributors to use the `az_` prefix and to update all user-facing references affected by a tool rename.

**Acceptance Scenarios**:

1. **Given** a contributor asks Copilot to add or rename an Azure DevOps MCP tool, **When** the relevant skill is used, **Then** it instructs the contributor to use the `az_` prefix as the canonical public naming rule.
2. **Given** a contributor plans a tool rename, **When** they follow the skill guidance, **Then** they are directed to update the affected user-facing references and validation surfaces, not just the primary tool registration.

---

### Edge Cases

- What happens when a repository example, test, or contract still uses an unprefixed Azure DevOps tool name after the rename? The feature must treat that reference as outdated and update it to the canonical prefixed name before the work is considered complete.
- What happens when a new Azure DevOps MCP tool is proposed without the `az_` prefix? The provided skills must direct contributors to adopt the prefix before the new tool is presented as canonical.
- What happens when a non-tool artifact contains similar wording but does not represent a public Azure DevOps MCP tool name? It remains unchanged unless it directly presents or validates a public tool name.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose every public Azure DevOps MCP tool name with the `az_` prefix while preserving a descriptive snake_case name after the prefix.
- **FR-002**: The system MUST rename the current public Azure DevOps MCP tools so their canonical user-facing names follow the `az_` prefix convention.
- **FR-003**: The system MUST preserve existing tool behavior, inputs, and outputs for renamed tools apart from the public name change unless a separate requirement explicitly changes behavior.
- **FR-004**: The system MUST update repository-maintained user-facing references to renamed Azure DevOps MCP tools so they use the canonical prefixed names.
- **FR-005**: The system MUST provide reusable, agent-discoverable skills that instruct future contributors to use the `az_` prefix when adding, renaming, or reviewing Azure DevOps MCP tools.
- **FR-006**: The provided skills MUST identify the user-facing surfaces that need review when a public Azure DevOps MCP tool name changes, including exposed tool listings, validation assets, and repository guidance.
- **FR-007**: The system MUST treat the prefixed Azure DevOps MCP tool names as canonical for future repository-owned examples and guidance.
- **FR-008**: The system MUST leave non-tool naming surfaces unchanged unless they directly present or validate a renamed public Azure DevOps MCP tool name.

### Key Entities *(include if feature involves data)*

- **Public Azure MCP Tool Name**: The canonical user-facing identifier for an Azure DevOps MCP capability, expected to begin with `az_` and remain stable across discovery, invocation, and documentation.
- **Tool Reference Surface**: Any repository-maintained example, prompt, contract, checklist, or validation artifact that presents or checks a public Azure DevOps MCP tool name.
- **Naming Guidance Skill**: A reusable workspace customization artifact that Copilot can discover during future Azure MCP work to explain the naming rule and the follow-up surfaces that must stay in sync.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of publicly exposed Azure DevOps MCP tools presented to users begin with the `az_` prefix.
- **SC-002**: 100% of repository-maintained canonical references to renamed Azure DevOps MCP tools use the prefixed names.
- **SC-003**: A contributor can identify the required Azure MCP tool naming rule and the affected update surfaces within 5 minutes using the repository-provided guidance alone.
- **SC-004**: A reviewer can confirm whether an Azure DevOps MCP tool change complies with the naming convention without consulting documentation outside the repository.

## Assumptions

- Backward-compatibility aliases for the previous unprefixed tool names are out of scope unless requested in a later feature.
- This feature applies only to public Azure DevOps MCP tool names and the repository-managed references that present them to users.
- Resource URIs, package names, internal helper names, and unrelated identifiers remain unchanged unless they directly expose a renamed public tool name.
- The future-facing guidance will be stored as workspace-shared Copilot skills so the convention is discoverable during later implementation work.