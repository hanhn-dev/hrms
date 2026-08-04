---
source-root: HRMS-DATABASE/HRMS-CRBBOOKING/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRMS-CRBBOOKING — Table Catalog

Database: `HRM_CRBooking_Prod`. Conference-room and virtual-room booking.

10 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `tblTimeZone` | Lookup of timezone IDs, aliases, and display text values. | — |
| `TCLAIM` | Master list of claims/permissions (claim text) grouped by module. | — |
| `TCLAIM_ASSIGNMENT` | Assigns claims to employees/roles per employer for access control. | `TCLAIM` |
| `TCONFBOOKINGS` | Conference room bookings with floor/room, date/time, participants, and meeting/dial-in details. | — |
| `TLOOKUP` | Generic hierarchical lookup values scoped by root employer, with parent/sub-parent links. | — |
| `TLOOKUP_CL_UAT` | UAT/testing variant of TLOOKUP hierarchical lookup values table. | — |
| `tlookup012025` | Dated snapshot/backup copy of TLOOKUP lookup values table from January 2025. | — |
| `TROOM_DETAILS` | Room-to-option quantity details (e.g., equipment/amenities) per floor and room. | — |
| `TVirtualroomAuthetication` | Authentication method lookup values for virtual meeting rooms per employer. | — |
| `TVirtualRoomLoginDetails` | Login credentials (username/password) for virtual meeting room accounts by employee. | — |
