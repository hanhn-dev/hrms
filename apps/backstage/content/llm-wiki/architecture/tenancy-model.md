---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TEmployerDetails.sql
  - HRMS-DATABASE/HRMS/TABLES/TEmployee.sql
  - HRMS-DATABASE/HRMS/TABLES/TRoles.sql
confidence: high
last-analyzed: 2026-06-26
---

# Tenancy Model

How the system isolates customers. The HRMS is **multi-tenant with shared
schema and row-level isolation by `Employerid`** — not database-per-tenant.

## The isolation boundary: `Employerid`

- `TEmployerDetails` is the tenant root, PK `Employerid` (`TEmployerDetails.sql:95`).
  `Employerid` defaults to `0` (`:44`).
- Nearly every operational table carries an `Employerid` column (verified on
  `TEmployee`, `TRoles`, `TLeaveTypeMaster`, `TWorkflowManagement`, `TAuditTrail`,
  `TDeviceInvalidLoginAttemptDetails`, ...). Procedures filter and write by
  `@Employerid`. The boundary is therefore enforced **in procedure logic**, not
  by the engine — a procedure that forgets the `Employerid` predicate leaks
  across tenants (a defect class to watch).
- Composite keys include the tenant where natural keys repeat per tenant, e.g.
  `TLeaveTypeMaster` PK is `(LeaveCode, Employerid)` — the same `LeaveCode` can
  exist for different employers (`TLeaveTypeMaster.sql:63`).

## Tenant hierarchy (groups of organizations)

`TEmployerDetails` models a **tree of organizations**, not just flat tenants:

- `ParentEmployerid` (`:20`) and `RootEmployerId` (`:48`) — parent/root links.
- `parentcustid` / `custid` (`:17,51`) — customer-id linkage.
- `IsSequenceWithRootOrganization CHAR(1)` (`:50`) and
  `IsCrossReportingApplicable CHAR(1)` (`:47`) — control whether numbering and
  reporting span the org group.
- `EmployerGUID UNIQUEIDENTIFIER DEFAULT newid()` (`:56`) — stable external id.

This supports holding-company / subsidiary structures sharing one deployment.

## Per-tenant configuration

`TEmployerDetails` is also the per-tenant config store: licensing
(`LicenseKey`/`LicenseCount`), password policy, time zone (`TimeZone`/
`TimeZoneId`, `UICulture`), attendance capture mode, and ~50 feature-flag columns
(`:61-94`). Leave types, workflows, roles, and page access are all scoped per
`Employerid`, so two tenants on the same schema can behave very differently.

## What is shared vs isolated

- **Shared**: schema, stored-procedure code, the engine. One physical database
  (`HRMS_PROD`) serves all tenants.
- **Isolated (by row)**: all business data, configuration, roles, workflows.
- **Cross-database**: the satellite modules are separate databases but follow the
  same `Employerid` row-level model within themselves.

> Risk: because isolation is convention-based (no per-tenant DB, FK, or row-level
> security policy observed), correctness depends on every procedure applying the
> `Employerid` filter. No SQL Server Row-Level Security policy was found in the
> table scripts. See `../assumptions/open-questions.md`.
