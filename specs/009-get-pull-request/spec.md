# Feature Specification: Get Pull Request for Review

**Feature Branch**: `[009-get-pull-request]`  
**Created**: 2026-07-30  
**Status**: Draft  
**Input**: User description: "Add one more tool to the MCP to get the Pull Request based on the link or Pull Request Id so that I can ask to review the change."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fetch a Pull Request by ID or Link (Priority: P1)

As an AI agent or reviewer, I want to provide either a pull request ID or an Azure DevOps pull request URL and receive that pull request's details so I can start a code review without first finding work-item links.

**Why this priority**: Direct PR lookup is the entry point for review. Without it, the agent cannot reach the change set from a PR link or ID alone.

**Independent Test**: Call the tool with a known PR ID and again with that PR's HTTPS URL, and verify both return the same pull request identity, title, branches, and status.

**Acceptance Scenarios**:

1. **Given** a valid positive pull request ID in the configured project, **When** the tool is invoked with that ID, **Then** the response includes the matching pull request metadata.
2. **Given** a valid Azure DevOps pull request HTTPS URL for the configured organization, **When** the tool is invoked with that URL, **Then** the response includes the matching pull request metadata.
3. **Given** an invalid ID, missing PR, or URL outside the configured organization, **When** the tool is invoked, **Then** the response clearly reports the failure without inventing PR content.

---

### User Story 2 - Review Changed Files with Content (Priority: P1)

As an AI agent or reviewer, I want the response to include the changed files with enough content to review (paths, change kinds, and text diffs or file contents) so I can assess the proposed change.

**Why this priority**: Metadata alone is not enough for review. Reviewers need the actual file changes.

**Independent Test**: Fetch a PR that edits, adds, and deletes text files and verify the response includes each changed path with reviewable content or an explicit omission reason for binary/oversized files.

**Acceptance Scenarios**:

1. **Given** a pull request with text file edits, **When** the tool returns review context, **Then** each returned text change includes path, change kind, and reviewable base/current content or line-level diff information.
2. **Given** a pull request includes binary or oversized files, **When** the tool returns review context, **Then** those files are listed with an explicit omission or truncation reason and without dumping unusable binary payloads.
3. **Given** a pull request renames a file, **When** the tool returns review context, **Then** both the original and current paths are preserved.

---

### User Story 3 - Page Large Change Sets (Priority: P2)

As an AI agent or reviewer, I want to page through large pull request change lists so I can review all files without exceeding a single response size limit.

**Why this priority**: Large PRs are common; unbounded payloads make review unreliable.

**Independent Test**: Fetch a PR with more changed files than the default page size and verify the first page reports totals/has-more, then fetch the next page with skip/top and receive the remaining files.

**Acceptance Scenarios**:

1. **Given** a pull request has more changed files than the requested page size, **When** the first page is returned, **Then** the response reports total count, returned count, skip, top, and whether more files remain.
2. **Given** a previous page indicated more changes, **When** the caller requests the next page with skip/top, **Then** the response returns the next slice of changed files.

---

### Edge Cases

- What happens when the caller provides a bare numeric ID with no repository in the URL?
- What happens when the PR URL belongs to a different Azure DevOps organization than the configured credentials?
- What happens when the PR exists but the latest iteration or some file contents cannot be read?
- How does the response behave for add-only or delete-only files that have content on only one side?
- What happens when `top`/`skip` values are omitted, zero, negative, or above the allowed maximum?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a single pull request identifier that is either a positive integer ID or an Azure DevOps pull request HTTPS URL.
- **FR-002**: When only a pull request ID is provided, the system MUST look up the pull request in the configured default project.
- **FR-003**: When a pull request URL is provided, the system MUST extract the project, repository, and pull request ID from the URL.
- **FR-004**: The system MUST reject pull request URLs that do not belong to the configured Azure DevOps organization.
- **FR-005**: The system MUST return pull request metadata needed for review, including identity, title, description, status, author, source/target branches, reviewers, related work item IDs when available, and commit/hash summaries.
- **FR-006**: The system MUST return the cumulative changed-file set for the latest pull request iteration relative to the original target baseline.
- **FR-007**: The system MUST support paging changed files through bounded `top` and `skip` inputs.
- **FR-008**: For each returned text file change, the system MUST include reviewable content such as base content, current content, and/or line diff blocks when available.
- **FR-009**: The system MUST omit or truncate binary and oversized file contents while still listing the file path and an explicit reason.
- **FR-010**: The system MUST preserve rename information by returning both original and current paths when applicable.
- **FR-011**: The system MUST return a clear not-found or inaccessible failure when the pull request cannot be retrieved.
- **FR-012**: The system MUST expose the capability as an MCP tool named `az_get_pull_request`.

### Assumptions

- Callers use the same Azure DevOps organization already configured for az-mcp.
- Numeric ID lookup is scoped to the configured default project unless a URL supplies the project.
- Reviewers primarily need the latest cumulative change set, not historical per-iteration diffs.
- A default page size of 50 changed files and a maximum of 100 is sufficient for interactive review, with paging for larger PRs.
- Text content larger than a fixed byte threshold should be truncated rather than returned in full.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reviewers can retrieve a pull request by ID or URL in one request and receive correct PR identity metadata every time for valid inputs.
- **SC-002**: For text-file changes on a valid pull request, reviewers receive enough path and content/diff detail to begin a code review without opening Azure DevOps.
- **SC-003**: Binary or oversized files never cause the overall review payload to fail; they are listed with an explicit omission or truncation reason.
- **SC-004**: When a pull request has more than the default page of changed files, reviewers can retrieve the full set by paging with `skip`/`top`.
- **SC-005**: Invalid IDs, missing PRs, and cross-organization URLs produce clear actionable failures rather than partial invented content.
