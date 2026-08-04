# Principles

Design principles the codebase actually follows, observed from the objects — not
aspirational statements.

- **Logic lives in the database.** Validation, workflow routing, balance
  ledgers, and report shaping are implemented in T-SQL stored procedures, not in
  the (external) application tier. The SP surface is the contract.

- **Everything is tenant-scoped.** `Employerid` is a near-universal column;
  procedures take `@Employerid` and filter by it. Tenancy is row-level, not
  database-per-tenant. (`../architecture/tenancy-model.md`)

- **Approvals are first-class and configurable.** A single workflow engine
  (`TWorkflowManagement` + `TRequestWorkflows`) routes both employee requests and
  administrative config changes. New approvable actions plug in via a
  `RequestType` branch rather than a bespoke flow. (`../reference/extension-points.md`)

- **Configuration over code.** Tenant behaviour is toggled by ~50 feature-flag
  columns on `TEmployerDetails` and by lookup/config tables (`TLOOKUP`,
  `TDATA_GRID_CONFIG`), avoiding code changes for per-tenant variation.

- **Preserve, don't destroy.** Soft deletes (`IsActive`, `IsDelete`), `*_History`
  shadow tables, append-only ledgers (`TLeaveBalanceLedger`), and an audit trail
  (`TAuditTrail`, `TActivityLog`) keep historical state. Hard deletes are rare.

- **Protect PII.** Sensitive employee fields are stored encrypted
  (`*_Encrypted VARBINARY`), with explicit personal-field erasure/retention
  controls per tenant.

- **Backward-compatible, additive change.** New behaviour tends to arrive as new
  nullable columns / new flags / new versioned objects (`_V1`/`_V2`,
  `*_<date>` backups) rather than breaking existing signatures.

## Tensions observed (not idealized)

- **Inconsistency under additive change.** The additive style produces drift:
  mixed `LeaveStatus` encodings, inconsistent column casing, and many
  near-duplicate/backup objects coexist in the tree. See
  `../assumptions/open-questions.md`.
- **Relationships often by convention.** Many `*Id` links are not enforced FKs;
  integrity is maintained in procedure logic.
