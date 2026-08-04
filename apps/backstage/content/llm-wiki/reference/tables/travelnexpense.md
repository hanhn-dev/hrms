---
source-root: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRMS_TRAVELNEXPENSE — Table Catalog

Database: `TravelNExpense_Prod`. Travel requests, itineraries, multi-category expense claims, advances, payment setup.

59 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `tAdvanceRequest_AdvanceTypeStatus` | Tracks approval/rejection status, level, comments and amount for an advance type request by employee. | — |
| `tAdvances_AdvanceByEmployeeDetails` | Advance request details per employee: type, limit, estimated amount and period, currency. | — |
| `tAdvances_AdvanceDocuments` | Stores documents attached to an employee's advance request. | — |
| `tAdvances_AdvancePaidDetails` | Records payment details of approved advances, including amount paid, mode and payment status. | — |
| `tAdvances_AdvanceRequestByEmployee` | Employee advance request header linking travel request, cost center, project and total amount requested. | — |
| `tAdvances_AdvanceRequestStatus` | Status transition history (from/to status, approval amount) for advance requests. | — |
| `tAdvanceType_Limit` | Configures maximum advance limits per advance type by grade, designation and currency. | — |
| `tAdvanceType_Limit_History` | History/audit log of changes to advance type limit configuration (_History of tAdvanceType_Limit). | — |
| `tAdvanceTypeDetails` | Master list of advance types defined per employer. | — |
| `TCLAIM` | Master list of claim types/labels associated with a module. | — |
| `TCLAIM_ASSIGNMENT` | Assigns claim types to roles/employees within an employer. | `TCLAIM` |
| `TCLAIM_ASSIGNMENT_20210225` | Dated snapshot/backup copy of TCLAIM_ASSIGNMENT. | — |
| `TEMAIL_NOTIFICATION` | Queues and tracks email notifications sent for travel/expense requests, including delivery status. | — |
| `TEXPENSE` | Expense claim header with cost center, purpose, submitter, advance flag and linked travel request. | — |
| `tExpense_Advances` | Links an expense claim to advances used, tracking approved amounts and settlement balance. | — |
| `TEXPENSE_AUTO` | Auto/miscellaneous vehicle-related expense line items for an expense claim. | `TEXPENSE` |
| `TEXPENSE_COMMENT` | Comments logged against an expense claim. | `TEXPENSE` |
| `TEXPENSE_CONVEYANCE` | Conveyance/local travel expense line items including travel mode and distance for an expense claim. | `TEXPENSE` |
| `TEXPENSE_DIMALLOWANCE` | Daily allowance (per-diem) expense line items for an expense claim. | `TEXPENSE` |
| `TEXPENSE_DOCUMENT` | Stores supporting documents attached to an expense claim. | `TEXPENSE` |
| `TEXPENSE_FOODNBEV` | Food and beverage expense line items for an expense claim. | `TEXPENSE` |
| `TExpense_Limit` | Records the limit rule applied to a specific expense detail line for auditing. | — |
| `TEXPENSE_MEDICAL` | Medical expense line items for an expense claim, including facility, purpose and insurance type. | `TEXPENSE` |
| `TEXPENSE_OTHER` | Miscellaneous 'other' expense line items with free-text description for an expense claim. | `TEXPENSE` |
| `TEXPENSE_PARTSSALES` | Parts sales related expense line items for an expense claim. | `TEXPENSE` |
| `TEXPENSE_PAYMENT` | Payment/settlement details for an expense claim, including approved, paid and converted amounts. | `TEXPENSE` |
| `TEXPENSE_PROJECT` | Project-related expense line items linking an expense claim to project and cost center. | `TEXPENSE` |
| `TEXPENSE_SPLITDETAILS` | Splits an expense claim's amount across multiple employees/projects by percentage. | — |
| `TEXPENSE_STATUS` | Status and sub-status history for an expense claim. | `TEXPENSE` |
| `TEXPENSE_STATUS_20210528` | Dated snapshot/backup copy of TEXPENSE_STATUS. | — |
| `TEXPENSE_STATUS_20210531` | Dated snapshot/backup copy of TEXPENSE_STATUS. | — |
| `TEXPENSE_STATUS_20210622` | Dated snapshot/backup copy of TEXPENSE_STATUS. | — |
| `TEXPENSE_STAY` | Lodging/stay expense line items for an expense claim, including city category and stay type. | `TEXPENSE` |
| `TEXPENSE_SUPPLIESOFFICE` | Office supplies expense line items for an expense claim. | `TEXPENSE` |
| `TEXPENSE_TELEPHONE` | Telephone expense line items for an expense claim. | `TEXPENSE` |
| `TEXPENSE_TRAVEL` | Travel fare expense line items linking an expense claim to a travel request and mode/class. | `TEXPENSE` |
| `TITINERARY_DOC` | Documents attached to a travel itinerary/schedule. | `TTRAVEL_REQUEST`, `TTRAVEL_SCHEDULE` |
| `TLevelWiseExpenseDetails` | Configures maximum expense limits per expense type by approval level, with workflow settings. | — |
| `TLevelWiseExpenseDetails_History` | History/audit log of changes to level-wise expense limit configuration (_History of TLevelWiseExpenseDetails). | — |
| `TLOOKUP` | Generic hierarchical lookup/reference values table used across the module, scoped by employer. | — |
| `tlookup_bkp232023` | Backup copy of TLOOKUP taken on a specific date. | — |
| `TPaymentSetup` | Stores employer bank/payment setup details such as account, IFSC and UPI for disbursements. | — |
| `TRequestWorkflows_20210528` | Dated snapshot/backup copy of a request approval workflow table. | — |
| `TRequestWorkflows_4061` | Snapshot/backup copy of a request approval workflow table. | — |
| `TTNEEmployerConfiguration` | Per-employer configuration for travel & expense module, e.g. single-approval and acknowledgment rules. | — |
| `TTRAVEL_ACCOMMODATION` | Accommodation booking preferences and stay details for a travel request. | `TTRAVEL_REQUEST` |
| `TTRAVEL_INSURANCE_PERIOD` | Defines travel insurance coverage period by visa type and country. | — |
| `TTRAVEL_ITINERARY_CHANGE` | Records changes made to a travel itinerary, including change date, fee and approval. | `TTRAVEL_ITINERARY_OPTIONS`, `TTRAVEL_REQUEST`, `TTRAVEL_SCHEDULE` |
| `TTRAVEL_ITINERARY_FARE` | Fare details per traveler type for a travel itinerary option. | `TTRAVEL_ITINERARY_OPTIONS`, `TTRAVEL_REQUEST`, `TTRAVEL_SCHEDULE` |
| `TTRAVEL_ITINERARY_OPTIONS` | Candidate travel itinerary/flight options with carrier, fare and schedule details for a travel request. | `TTRAVEL_REQUEST`, `TTRAVEL_SCHEDULE` |
| `TTRAVEL_ITINERARY_TICKET` | Ticket booking details (ticket number, price, booking ref) for a chosen travel itinerary. | `TTRAVEL_ITINERARY_OPTIONS`, `TTRAVEL_REQUEST`, `TTRAVEL_SCHEDULE` |
| `TTRAVEL_REQ_ADVANCE` | Advance amount requested, sanctioned and paid against a travel request. | `TTRAVEL_REQUEST` |
| `TTRAVEL_REQ_STATUS` | Status and sub-status history for a travel request. | `TTRAVEL_REQUEST` |
| `TTRAVEL_REQUEST` | Travel request header with purpose, client details, type, country and approval submission info. | — |
| `TTRAVEL_SCHEDULE` | Onward and return travel schedule (route, dates, mode, class) for a travel request. | `TTRAVEL_REQUEST` |
| `TTRAVEL_TICKET_DOC` | Documents attached to a travel itinerary ticket. | `TTRAVEL_ITINERARY_OPTIONS`, `TTRAVEL_ITINERARY_TICKET`, `TTRAVEL_REQUEST`, `TTRAVEL_SCHEDULE` |
| `TTRAVELLER_DOC` | Documents attached to a traveler on a travel request. | `TTRAVELLERS_LIST`, `TTRAVEL_REQUEST` |
| `TTRAVELLERS_DOCS` | Document references (by DocId) associated with a traveler list entry. | `TTRAVELLERS_LIST` |
| `TTRAVELLERS_LIST` | List of travelers on a travel request with passport, visa and personal details (encrypted fields). | `TTRAVEL_REQUEST` |
