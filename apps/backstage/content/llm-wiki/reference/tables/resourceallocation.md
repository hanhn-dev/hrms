---
source-root: HRMS-DATABASE/HRMS-RESOURCEALLOCATION/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRMS-RESOURCEALLOCATION — Table Catalog

Database: `ResourceAllocation`. Resource/staffing allocation, allocation owners, lock matrix, reallocation requests.

23 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `TCLAIM` | Reference list of claims/permissions text, each linked to a module. | — |
| `TCLAIM_ASSIGNMENT` | Assigns claims to employees by role and employer for access control. | `TCLAIM` |
| `TCLAIM_ASSIGNMENT_FIJI` | Fiji-specific variant of claim-to-employee/role assignment mapping. | — |
| `TDATA_GRID_CONFIG` | Stores per-employee UI grid configuration settings by grid and config type. | — |
| `TEMAIL_NOTIFICATION` | Queues email notifications for requests with status, content, and delivery attempt tracking. | — |
| `TEMAIL_NOTIFICATION_DP` | Duplicate/staging (_DP) variant of TEMAIL_NOTIFICATION with an added new business unit field. | — |
| `TRAS_LOCK_MATRIX` | Defines lock rules for resource allocation by project/client, including lock and unlock timing. | — |
| `TRAS_UNLOCK_REQUEST` | Tracks requests to temporarily unlock a locked resource allocation for a date range. | — |
| `TRASBUConfig` | Configuration flags per business unit indicating BU and Manager designations. | — |
| `TRASFormat` | Reference formatting/category data for resource allocation by location and billable type. | — |
| `TReallocationInitiate` | Records employee reallocation requests, capturing old and new project/BU/manager/allocation details. | — |
| `TReallocationInitiate_DP` | Duplicate/staging (_DP) variant of TReallocationInitiate with a new business unit tracking field. | — |
| `TReallocationInitiateStatusHistory` | History log of status changes and approval levels for reallocation initiate requests. | — |
| `tref_ras_excelConfig` | Reference config defining Excel import row fields, mandatory flags, and max lengths per employer. | — |
| `tref_ras_excelConfig_custom` | Employer-specific customization overrides for the Excel config reference table. | — |
| `TRESOURCE_ALLOC_ADDL_OWNER` | Tracks additional (secondary) owners assigned to an employee's resource allocation with percentage. | — |
| `TRESOURCE_ALLOC_OWNER_BUSUNIT` | Maps resource allocation owners to business units with view/edit/confirm permissions and prime-owner flag. | `TRESOURCE_ALLOCATION_OWNER` |
| `TRESOURCE_ALLOC_OWNER_BUSUNIT_DP` | Duplicate/staging (_DP) variant of TRESOURCE_ALLOC_OWNER_BUSUNIT with a new business unit field. | — |
| `TRESOURCE_ALLOC_OWNER_BUSUNIT_REQUEST` | Pending approval requests for changes to resource allocation owner business-unit assignments. | `TRESOURCE_ALLOCATION_OWNER` |
| `TRESOURCE_ALLOCATION_OWNER` | Defines the designated allocation owner per employee, with approval and deletion status. | — |
| `TRESOURCEALLOCATION` | Core table assigning an employee to a client/project/role with allocation percentage, dates, and rate. | — |
| `TRESOURCEALLOCATION_CONFIRMATION` | Records owner confirmation of an employee's resource allocation with confirmation date. | `TRESOURCE_ALLOCATION_OWNER` |
| `TRESOURCEALLOCATION_DP` | Duplicate/staging (_DP) variant of TRESOURCEALLOCATION with a new business unit tracking field. | — |
