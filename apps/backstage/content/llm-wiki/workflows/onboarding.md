# Onboarding

Getting productive on the HRMS database repository.

## Day 1 — orient

- Read, in order: `../identity/purpose.md`, `../architecture/system-overview.md`,
  `../architecture/module-catalog.md`, `../glossary/*`.
- Internalize the two load-bearing ideas: **(1)** everything is tenant-scoped by
  `Employerid`; **(2)** most state changes route through the approval engine
  (`../domain/approval-workflow.md`).
- Note the repo is **SQL object scripts only** — the calling ASP.NET app and the
  runtime databases are elsewhere.

## Day 2 — find your way around

- Layout per module: `TABLES/`, `STOREPROCEDURE/`, `FUNCTIONS/`, `VIEWS/`,
  `SYNONYMS/`, `UDT/`, plus `DDL/`/`DML/` for migrations (`../architecture/module-catalog.md`).
- Locate logic with `Glob`/`Grep` over `STOREPROCEDURE/` (there are ~5,000 SPs;
  do not browse by hand). Remember files are **UTF-16** — use the provided tools,
  not raw `grep`.
- Skim the schema backbone in `../reference/data-schema.md` and the SP contract in
  `../reference/service-apis.md`.

## Week 1 — make a change

- Branch as `#<PBI>`; mirror the PR subject format `<Type>: <description>`.
- When editing a procedure, **append** a change-log line in the header
  (`Modified by | Date | Reason PBI#<n>`); don't rewrite the header.
- Match existing naming (`../conventions/sql-naming.md`) and style
  (`../conventions/tsql-style.md`). Always include the `Employerid` filter.
- Take a `*_bkp<date>` snapshot before any destructive data change.

## Local dev setup

- Not specified in the repo. You need a SQL Server instance with all seven
  databases (so cross-database synonyms resolve) and the encryption key for PII
  columns. Exact setup is an open question — see `../assumptions/open-questions.md`.

<!-- TODO: needs input — local/dev environment provisioning is not documented in-repo. -->
