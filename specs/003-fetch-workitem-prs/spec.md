# Feature Specification: Work Item Pull Request Hash Collection

**Feature Branch**: `003-fetch-workitem-prs`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: User description: "I need a new mcp tool of azure which allows me to get all the Pull Requests of the given work item ids. There can be multiple work items and their child link such as Tasks and Issues at a time. This should be interactive with the users because after I have a list of PRs I also need to filter them out such as to filter by the author, the target branch and status. I can also sort them by merged date. The tool can ask those questions before summarize the list of PRs and their hashes. As the meaning of this task is to collect the PRs' hashes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gather Related Pull Requests Across Work Items (Priority: P1)

An AI agent or developer provides one or more work item IDs and receives a single consolidated list of pull requests linked to those work items and their eligible child work items, including Tasks and Issues.

**Why this priority**: This is the core business outcome. The feature is only valuable if users can collect pull requests for several related work items without repeating the lookup one item at a time.

**Independent Test**: Can be fully tested by requesting pull requests for multiple known work items that include child Tasks or Issues and confirming that the response contains the combined pull request set with no duplicate entries and with hash values for each pull request.

**Acceptance Scenarios**:

1. **Given** a user supplies multiple valid work item IDs, **When** the pull request lookup is run, **Then** the system returns the pull requests linked to all requested work items in one consolidated result.
2. **Given** a requested work item has child Tasks or Issues with linked pull requests, **When** the pull request lookup is run, **Then** the system includes pull requests linked through those child work items in the result.
3. **Given** the same pull request is linked to more than one requested or child work item, **When** the result is prepared, **Then** that pull request appears once and still shows the work items that caused it to be included.

---

### User Story 2 - Refine the Pull Request Set Interactively (Priority: P2)

After the initial pull request set is found, an AI agent or developer can narrow the result before review by choosing filters such as author, target branch, and status, and by selecting merged-date ordering.

**Why this priority**: The user’s stated goal is not just discovery but efficient review. Interactive filtering is necessary so the final result focuses on the pull requests whose hashes matter for the current task.

**Independent Test**: Can be tested by retrieving a mixed pull request set, applying author, target branch, and status filters, choosing merged-date ordering, and verifying that the final summary only contains pull requests that match the chosen criteria.

**Acceptance Scenarios**:

1. **Given** the system has found pull requests for the requested work items, **When** the user has not already supplied filter preferences, **Then** the system asks whether to filter by author, target branch, and status before producing the final summary.
2. **Given** the user skips one or more filter questions, **When** the summary is generated, **Then** the skipped filter dimensions remain unfiltered.
3. **Given** the user chooses merged-date ordering, **When** the final result is produced, **Then** the pull requests are presented in the selected merged-date order.

---

### User Story 3 - Review a Hash-Focused Summary (Priority: P3)

An AI agent or developer receives a concise final summary of the matching pull requests that includes the identifying details needed to understand each pull request and collect its related hash values.

**Why this priority**: The lookup is only actionable if the final output makes the pull requests easy to review and exposes the hash information the user is trying to collect.

**Independent Test**: Can be tested by verifying that the final response lists each matching pull request with its identifying metadata, associated work items, and the hash value or values needed to identify the related code changes.

**Acceptance Scenarios**:

1. **Given** one or more pull requests match the requested work items and selected filters, **When** the final summary is shown, **Then** each entry includes the pull request identity, author, status, target branch, related work items, and relevant hash value or values.
2. **Given** no pull requests are linked to the requested work items, **When** the lookup completes, **Then** the system returns a clear empty-result summary instead of a generic failure.
3. **Given** filters remove every candidate pull request, **When** the final summary is produced, **Then** the system clearly states that no pull requests matched the selected criteria.

---

### Edge Cases

- What happens when the user provides the same work item ID more than once?
- How does the system behave when some requested work items do not exist, are inaccessible, or have no eligible child work items?
- What happens when several requested or child work items point to the same pull request?
- How does the system present merged-date ordering when some returned pull requests are not yet merged?
- What happens when the selected author, target branch, or status filters remove all pull requests from the result?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to request pull requests for one or more work item IDs in a single lookup.
- **FR-002**: The system MUST support requests that include multiple top-level work item IDs at the same time.
- **FR-003**: The system MUST include pull requests linked directly to each requested work item.
- **FR-004**: The system MUST include pull requests linked to immediate child work items of each requested work item when those child work items are Tasks, Issues, or other eligible child records in the same work-tracking hierarchy.
- **FR-005**: The system MUST deduplicate pull requests that are linked to more than one requested or child work item.
- **FR-006**: The system MUST preserve traceability by showing which requested or child work items caused each returned pull request to be included.
- **FR-007**: After collecting candidate pull requests, the system MUST allow the user to refine the result by author before the final summary is produced.
- **FR-008**: After collecting candidate pull requests, the system MUST allow the user to refine the result by target branch before the final summary is produced.
- **FR-009**: After collecting candidate pull requests, the system MUST allow the user to refine the result by status before the final summary is produced.
- **FR-010**: The system MUST allow the user to skip any or all filter questions and continue with the unfiltered candidate set.
- **FR-011**: The system MUST allow the user to choose merged-date ordering for the final result.
- **FR-012**: The system MUST present a final summary of matching pull requests that includes the pull request identity, author, status, target branch, related work items, and the hash value or values needed to identify the related code changes.
- **FR-013**: The system MUST return a clear empty-result summary when no pull requests are found for the requested work items or when no pull requests remain after filtering.
- **FR-014**: The system MUST report requested work items that could not be evaluated because they were invalid, missing, or inaccessible without discarding results from valid work items.
- **FR-015**: The system MUST support at least 25 requested work item IDs in a single lookup.

### Key Entities *(include if feature involves data)*

- **Requested Work Item Set**: The collection of top-level work item IDs supplied by the user for a single lookup.
- **Eligible Child Work Item**: A child record, such as a Task or Issue, whose linked pull requests should be considered when gathering results for a requested work item.
- **Pull Request Match**: A unique pull request associated with one or more requested or child work items, including its identity, status, author, target branch, merged date when present, and related hash value or values.
- **Filter Preferences**: The user-selected author, target branch, status, and merged-date ordering choices that refine the candidate pull request set before summary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can retrieve a consolidated pull request list for up to 25 requested work item IDs, including eligible child Tasks and Issues, in a single lookup.
- **SC-002**: In at least 95% of normal-condition requests covering up to 25 requested work item IDs, users receive the initial pull request candidate set in under 10 seconds.
- **SC-003**: 100% of pull requests shown in the final summary include the hash value or values needed to identify the related code changes.
- **SC-004**: Users can apply any combination of author, target branch, and status filters, plus merged-date ordering, within one guided interaction without restarting the lookup.
- **SC-005**: When multiple requested or child work items reference the same pull request, the final summary shows one entry for that pull request while preserving its work item traceability.

## Assumptions

- The Azure DevOps context available to the user already permits reading the requested work items and their linked pull requests when access exists.
- The initial release supports up to 25 top-level work item IDs per lookup and may include any eligible child work items discovered from those items.
- Child expansion is limited to immediate child work items for the first release.
- Pull request hashes are already available from the linked pull request records or their directly related metadata; the feature does not infer code changes from unrelated repository history.
- Users can accept default behavior by skipping filter questions when they want a complete unfiltered summary.
