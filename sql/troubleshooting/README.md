# Troubleshooting

Ad-hoc SQL scripts for diagnosing PROD (and other environment) issues.

These scripts are **not** part of the database deployment surface. Do not add them to `hrms-sql.sqlproj`. Prefer read-only `SELECT` diagnostics; any script that writes data must say so clearly in the header and require explicit variable confirmation before running.

## Layout

Organized by feature area (same idea as top-level modules / `seeding/`). **Folders and script file names use kebab-case.**

```
troubleshooting/
  common/                 # Cross-cutting helpers (find string, explore tables, etc.)
  employee/               # Employee profile, employment, access issues
  employer/               # Tenant / org / module licensing issues
  workflow/               # Approval chains, pending tasks, page-title mappings
  authentication/         # Login, users, roles, sessions
  leave-and-attendance/   # Leave balances, attendance anomalies
  menu/                   # Menu visibility, hierarchy, role/page mapping
  travel-and-expense/     # Claims, advances, expense requests
  fields/                 # TEmployeeDetail_Fields dynamic dropdown query failures
```

Add a new feature folder when a cluster of scripts does not fit the areas above.

## Script conventions

1. **Header comment** — purpose, when to use it, required inputs, read-only vs write.
2. **Variables at the top** — all `@EmployerId`, `@EmployeeId`, `@FromDate`, etc. declared and clearly marked to set before run.
3. **PascalCase SQL identifiers** — table/column/procedure names match repo SQL style; one clause per line.
4. **kebab-case paths** — folders and `.sql` file names, e.g. `find-employees-with-no-pending-tasks.sql`, `diagnose-menu-visibility.sql`.
5. **No permanent objects** — avoid `CREATE PROCEDURE` / `CREATE VIEW` here unless the script drops them at the end; keep troubleshooting as runnable scripts.

## Safety

- Default to the least-privileged environment that still reproduces the issue.
- On PROD: run `SELECT` scripts first; never run unreviewed DML/DDL.
- Prefer wrapping any write in an explicit transaction with a commented `ROLLBACK` / `COMMIT` choice.
