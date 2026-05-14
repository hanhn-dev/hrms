# Feature Specification: Azure Work Items MCP Server

**Feature Branch**: `001-azure-workitems-mcp`  
**Created**: 2026-05-14  
**Status**: Draft  
**Input**: User description: "I need to build an mcp server for dealing with azure work items. I want to feed the work items' data to AI Agent and for prompting such as Description or Acceptance Criteria."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve Work Item Details for AI Prompting (Priority: P1)

An AI agent or developer uses the MCP server to retrieve a specific Azure DevOps work item by ID. The agent receives structured content including Title, Description, and Acceptance Criteria — ready to use as context in an AI prompt (e.g., "generate unit tests for this story", "summarize this requirement").

**Why this priority**: This is the core use case — feeding work item requirements to an AI. Without this, no value is delivered.

**Independent Test**: Can be fully tested by requesting work item #1234 and verifying that Title, Description, and Acceptance Criteria fields are returned correctly formatted.

**Acceptance Scenarios**:

1. **Given** a valid work item ID and configured Azure DevOps credentials, **When** the AI agent calls `get_work_item(id)`, **Then** the server returns the work item's Title, Description, Acceptance Criteria, State, Type, and Assigned To fields.
2. **Given** a work item with HTML-formatted Description or Acceptance Criteria, **When** the content is returned, **Then** the HTML is converted to clean plain text (or Markdown) suitable for use in an AI prompt.
3. **Given** an invalid or non-existent work item ID, **When** the AI agent calls `get_work_item(id)`, **Then** the server returns a clear error message indicating the work item was not found.

---

### User Story 2 - Query and List Work Items (Priority: P2)

An AI agent lists work items from a given Azure DevOps project or sprint iteration to discover what tasks exist, building a broad context for AI-assisted planning, estimation, or documentation.

**Why this priority**: Listing enables batch/discovery workflows. Without this, users must know exact IDs upfront, limiting the agent's autonomy.

**Independent Test**: Can be tested by querying "all active User Stories in project X sprint Y" and verifying the returned list matches items visible in Azure DevOps portal.

**Acceptance Scenarios**:

1. **Given** a project name and optional iteration path, **When** the AI agent calls `list_work_items(project, iteration)`, **Then** the server returns a list of matching work items with ID, Title, Type, and State.
2. **Given** a WIQL (Work Item Query Language) string, **When** the AI agent calls `query_work_items(wiql)`, **Then** the server executes the query and returns the matching work item summaries.
3. **Given** a query that returns no results, **When** the agent calls list or query, **Then** the server returns an empty list with no error.
4. **Given** a query returning more than 200 items, **When** the agent calls list or query, **Then** the server paginates results and indicates that more items are available.

---

### User Story 3 - Expose Work Items as MCP Resources (Priority: P3)

Individual work items are exposed as named MCP resources so that AI agents using resource-aware MCP clients can reference them by URI (e.g., `azdo://workitem/1234`) and attach them directly to conversation context.

**Why this priority**: Resource exposure enables richer MCP client integrations (e.g., attaching a work item as a file to a chat context), but is a progressive enhancement over the core tool-based access.

**Independent Test**: Can be tested independently by listing available MCP resources and verifying that known work items appear with correct URIs and content.

**Acceptance Scenarios**:

1. **Given** an MCP client that supports resources, **When** it requests the resource list, **Then** recently accessed or pinned work items appear as browsable resources.
2. **Given** a resource URI `azdo://workitem/{id}`, **When** the client reads the resource, **Then** it receives the work item content in a format consistent with `get_work_item`.

---

### Edge Cases

- What happens when the Azure DevOps organization or project does not exist or the credentials lack access?
- How does the server handle work items with empty Description or missing Acceptance Criteria fields?
- What happens when the Azure DevOps API rate limit is reached during a batch operation?
- How are work items with circular parent/child relationships handled when traversing work item hierarchies?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The MCP server MUST expose a `get_work_item` tool that retrieves a single work item by ID, returning Title, Description, Acceptance Criteria, State, Type, Tags, Assigned To, and Iteration Path.
- **FR-002**: The MCP server MUST expose a `list_work_items` tool that lists work items for a given Azure DevOps project, with optional filtering by type, state, and iteration.
- **FR-003**: The MCP server MUST expose a `query_work_items` tool that executes a WIQL query string and returns matching work item summaries.
- **FR-004**: HTML content in Description and Acceptance Criteria fields MUST be converted to clean plain text or Markdown before being returned to the AI agent.
- **FR-005**: The server MUST authenticate with Azure DevOps using a Personal Access Token (PAT) supplied via the `AZURE_DEVOPS_TOKEN` environment variable. The PAT is passed to `azure-devops-node-api`'s `getPersonalAccessTokenHandler`. No secrets may be hardcoded.
- **FR-006**: The MCP server MUST expose work items as MCP resources accessible by URI (`azdo://workitem/{id}`).
- **FR-007**: The server MUST return structured error messages when work items are not found, credentials are invalid, or the API is unreachable.
- **FR-008**: The server MUST be read-only for v1 — no create, update, or delete operations on work items are exposed. All MCP tools MUST be non-mutating.
- **FR-009**: The server MUST be configurable via environment variables for organization URL, project name, and authentication credentials — no secrets hardcoded.
- **FR-010**: The MCP server MUST use the `stdio` transport (standard input/output), making it compatible with VS Code Copilot Agent, Claude Desktop, Cursor, and any MCP client that spawns the server as a child process.

### Key Entities

- **Work Item**: ID, Title, Type (Bug/User Story/Task/Epic), State (Active/Closed/New), Description (plain text), Acceptance Criteria (plain text), Tags, Assigned To, Iteration Path, Area Path, Parent ID.
- **Work Item Summary**: Lightweight representation (ID, Title, Type, State) used in list/query results.
- **Project**: Azure DevOps organization URL + project name, used to scope queries.
- **Query**: A WIQL expression or structured filter (project + type + state + iteration) that selects a set of work items.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An AI agent can retrieve a work item's Description and Acceptance Criteria in a single call and use the content directly in a prompt without any additional formatting steps.
- **SC-002**: Work items with HTML-formatted fields are returned as clean, readable text — no raw HTML tags appear in AI-consumed content.
- **SC-003**: The server returns results for a single work item lookup in under 3 seconds under normal network conditions.
- **SC-004**: A WIQL query or list call returning up to 200 work items completes in under 10 seconds.
- **SC-005**: 95% of valid tool calls succeed on first attempt without manual intervention.
- **SC-006**: All configuration (org URL, project, credentials) can be changed without modifying server code — only environment/config changes required.

## Assumptions

- The primary users are developers or AI agents operating in a local development or CI environment with access to Azure DevOps.
- Azure DevOps (cloud, `dev.azure.com`) is the target platform. Azure DevOps Server (on-premises) is out of scope for v1.
- Only reading work item data is in scope unless clarified otherwise (FR-008).
- The Acceptance Criteria field in Azure DevOps is stored in the `Microsoft.VSTS.Common.AcceptanceCriteria` field; custom field names are out of scope for v1.
- Work item attachments (files, images) are out of scope; only text fields are returned.
- The server will be a standalone Node.js (or compatible runtime) process — no specific existing codebase to integrate with.
- Pagination will use Azure DevOps API defaults (max 200 items per page) for the initial version.
