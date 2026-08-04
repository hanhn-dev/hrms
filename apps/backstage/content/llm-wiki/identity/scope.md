# Scope

What is in and out of scope for this repository, judged by what the source
contains.

## In scope

- **SQL Server database object definitions** for seven HRMS databases: tables,
  stored procedures, functions, views, synonyms, user-defined table types.
- **Business logic in T-SQL** — the bulk of behaviour lives in stored
  procedures (validation, workflow routing, balance ledgers, report shaping).
- **One-off migration / data-fix scripts** under `DDL/` and `DML/`
  (e.g. `HRMS/DML/.../Remove-ApproveStatus`), and SSIS staging tables
  (`*_SSIS_Temp_*`) used for tenant data imports.
- **Tenant configuration** as data + schema: `TEmployerDetails` feature flags,
  per-tenant leave types, workflows, role/page access.

## Out of scope (not present in this repository)

- **Application / API tier** — the .NET (ASP.NET, `/HRM/Login.aspx` referenced in
  `ELMAH_LogError`) front end and service layer that call these procedures are
  not in this repo. The SP signatures are the contract; the callers are external.
- **Runtime configuration & secrets** — connection strings, encryption keys
  (the PII `*_Encrypted` columns are populated by an external key), environment
  config. No env files are present.
- **CI/CD and deployment automation** — no pipeline, Dockerfile, or IaC found.
- **Authentication implementation** — password hashing/verification and session
  issuance happen in the app tier; the DB stores only policy and audit
  (`TEmployerDetails` password policy, `TDeviceInvalidLoginAttemptDetails`).
- **ORM / generated data-access code** — access is via hand-written stored
  procedures, not an ORM.

## Boundary notes

- The seven databases are deployed and versioned together here but run as
  **independent databases** linked by synonyms; see
  `../reference/module-dependency-graph.md`.
- Many objects are historical: `*_History`, `*_bkp<date>`, `_<numericid>`,
  per-tenant variants (`*_Brinton`, `*_Nyati`, `*_Sunfire`, `*_Oswal`). These
  are real artifacts in scope but are **not the current live object** for their
  base name.
