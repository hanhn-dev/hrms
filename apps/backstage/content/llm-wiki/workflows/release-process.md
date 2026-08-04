# Release Process

How database changes reach production. The repository contains no CI/CD config,
so this is reconstructed from the artifacts and git history; runtime deployment
steps are external.

## What the repo shows

- Changes are made on a per-PBI branch and merged to `master` via PR
  (`../conventions/branching-strategy.md`).
- Each object is an idempotent `*.sql` script (`CREATE`/`DROP IF EXISTS`).
- One-off data/schema migrations are kept under `HRMS/DDL/` and `HRMS/DML/`
  (e.g. `DML/86966/Remove-ApproveStatus`), suggesting numbered, manually-applied
  change scripts.
- Backups before risky changes are taken as `*_bkp<date>` table copies, visible
  throughout `TABLES/` — implying changes are applied directly to live databases
  with a snapshot-first safety step.

## Inferred process

1. Develop on `#<PBI>` branch; update the object script(s) and append a
   change-log comment.
2. PR review → merge to `master`.
3. A DBA/deploy step (external) applies the changed object scripts and any
   `DDL/`/`DML/` migration to each target database (`HRMS_PROD` and the relevant
   satellite). Cross-database synonyms must be re-pointed per environment.
4. Pre-change table backups (`*_bkp<date>`) are taken for destructive edits.

## Rollback

No automated rollback. Recovery relies on the `*_bkp<date>`/`_History` copies and
SQL Server backups (backup policy not in repo).

<!-- TODO: needs input — the actual deploy tooling (SSDT dacpac? manual scripts?
SQL Agent?) and environment promotion path are defined outside this repo. -->
