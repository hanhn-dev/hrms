# Feature Specification: Aggregate Work Item Context

**Feature Branch**: `[007-concat-workitem-context]`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "I need a new tool in az-mcp to concat the `Description` and `Acceptance Criteria` and `Image Attachments` of the given work item and all of its children `Work Item`. For example, there are total 4 work items 1,2,3,4 and the work item 2,3,4 are children of the work item 1. When I provide work item 1, the tool should get the `Description` and `Acceptance Criteria` and `Image Attachments` of all work items 1,2,3,4. I need you to do that because a big work item can be split into smaller ones and I need AI Agent to have the full picture of the work item."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gather Full Hierarchy Context (Priority: P1)

As an AI agent or analyst, I want to provide a parent work item and receive the combined context from that work item and all of its child work items so I can understand a split requirement without opening each item separately.

**Why this priority**: The primary value is giving the agent the complete business context in one request. If the hierarchy is not consolidated first, the user still has to reconstruct the picture manually.

**Independent Test**: Request combined context for a work item that has known child work items and verify that the response includes the requested work item plus every readable descendant work item exactly once, with each item's Description, Acceptance Criteria, and image attachments represented in the result.

**Acceptance Scenarios**:

1. **Given** a requested work item has multiple child work items, **When** the combined context is requested, **Then** the response includes content from the requested work item and all readable child work items in the same hierarchy.
2. **Given** the hierarchy contains multiple levels of child work items, **When** the combined context is requested, **Then** the response includes readable descendants from the full hierarchy rather than only the first child level.
3. **Given** the requested work item has no child work items, **When** the combined context is requested, **Then** the response still returns that work item's own context as a valid result.

---

### User Story 2 - Preserve Source Traceability (Priority: P2)

As an AI agent or reviewer, I want each returned content block to remain associated with its source work item so I can understand which description, acceptance criteria, and images came from which part of the hierarchy.

**Why this priority**: A combined response is only useful if the source of each piece of context remains clear. Without traceability, the output becomes harder to trust and act on.

**Independent Test**: Request combined context for a hierarchy with multiple child work items and verify that each returned section clearly identifies its source work item and does not merge different work items into an unlabeled block of text.

**Acceptance Scenarios**:

1. **Given** the response includes content from several related work items, **When** the user or agent reviews the result, **Then** each content section identifies the source work item it came from.
2. **Given** one or more included work items do not contain a Description, Acceptance Criteria, or image attachments, **When** the result is prepared, **Then** the response makes the missing content explicit without misattributing other work items' content.

---

### User Story 3 - Continue Through Partial Gaps (Priority: P3)

As an AI agent or analyst, I want the combined context request to return all readable content even when some child work items or attachments cannot be accessed so I can still work with the available context and see what was omitted.

**Why this priority**: Real hierarchies are often incomplete, partially inaccessible, or unevenly populated. The feature should remain useful even when the full hierarchy cannot be read perfectly.

**Independent Test**: Request combined context for a hierarchy where at least one child work item or attachment is unavailable and verify that the response still returns the readable items while identifying which items or attachments could not be included.

**Acceptance Scenarios**:

1. **Given** some child work items in the hierarchy are inaccessible or unavailable, **When** the combined context is requested, **Then** the response includes the readable work items and clearly identifies the omitted ones.
2. **Given** the requested root work item cannot be found or read, **When** the combined context is requested, **Then** the response returns a clear failure explaining that the requested hierarchy could not be evaluated.
3. **Given** an included work item has non-image attachments only, **When** the result is prepared, **Then** those attachments are not presented as image context.

---

### Edge Cases

- What happens when the requested hierarchy contains descendants deeper than one child level?
- What happens when the same descendant work item is encountered more than once through related hierarchy links?
- How does the response behave when some included work items have missing Description fields, missing Acceptance Criteria fields, or no image attachments?
- What happens when some child work items or image attachments cannot be read with the current permissions?
- How does the response behave when the requested work item has no children and only its own context is available?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a user to request one combined context result for a specified work item.
- **FR-002**: The system MUST include the requested work item in the combined context result.
- **FR-003**: The system MUST include every readable descendant work item in the requested work item's child hierarchy in the same combined context result.
- **FR-004**: The system MUST gather the Description content from each included work item.
- **FR-005**: The system MUST gather the Acceptance Criteria content from each included work item.
- **FR-006**: The system MUST gather image attachments associated with each included work item.
- **FR-007**: The system MUST return the gathered work item content as one consolidated response that is suitable for downstream AI review without requiring separate per-item lookups for the included Description, Acceptance Criteria, and image attachment context.
- **FR-008**: The system MUST preserve traceability in the consolidated response by identifying the source work item for each included content block and image attachment.
- **FR-009**: The system MUST include each readable work item at most once in the consolidated response, even if the hierarchy traversal encounters it more than once.
- **FR-010**: The system MUST explicitly indicate when an included work item has no Description, no Acceptance Criteria, or no image attachments.
- **FR-011**: The system MUST return the readable portion of the hierarchy even when one or more descendant work items or image attachments cannot be included.
- **FR-012**: The system MUST identify descendant work items or image attachments that were omitted because they were unavailable or inaccessible.
- **FR-013**: The system MUST return a clear failure when the requested root work item cannot be found or read.
- **FR-014**: The system MUST treat non-image attachments as out of scope for image context and exclude them from the returned image attachment set.

### Key Entities *(include if feature involves data)*

- **Root Work Item**: The work item provided by the user as the starting point for the combined context request.
- **Descendant Work Item**: Any child work item that belongs to the root work item's hierarchy and contributes content to the combined result when readable.
- **Combined Work Item Context**: The single returned artifact that contains the Description content, Acceptance Criteria content, image attachment context, source labels, and omission notices for the requested hierarchy.
- **Image Attachment Context**: The user-consumable representation of an image attached to a work item, including the source work item and enough identifying information for the image to be reviewed alongside the textual context.
- **Omission Notice**: A record that identifies a descendant work item or image attachment that could not be included and explains that it was unavailable or inaccessible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can retrieve the readable Description content, Acceptance Criteria content, and image attachment context for an entire requested work item hierarchy in a single request.
- **SC-002**: In validation scenarios with readable descendant work items, 100% of readable work items in the requested hierarchy appear exactly once in the combined result.
- **SC-003**: In validation scenarios with image attachments, 100% of returned image attachment entries identify the work item they came from.
- **SC-004**: When some descendants or image attachments are unavailable, the response still returns the readable hierarchy content and omission notices in 100% of those scenarios.
- **SC-005**: A reviewer can identify which work item supplied each returned description, acceptance-criteria block, and image reference without consulting separate work item responses.

## Assumptions

- The child hierarchy for a requested work item is the authoritative scope for which related work items should be included in the combined context.
- The feature scope is limited to Description, Acceptance Criteria, and image attachments; other work item fields and non-image attachments are out of scope unless requested later.
- Existing repository access and permissions determine which work items and attachments are readable for a given request.
- Users and AI agents prefer one consolidated hierarchy response over manually gathering individual work item details from separate calls.
