# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SQL script repository for the HRMS database (SQL Server 2017+, `Sql140DatabaseSchemaProvider`). Contains stored procedures, functions, views, and incremental DDL/DML change scripts. The Visual Studio project file is `hrms-sql.sqlproj`.

Scripts are executed manually via SSMS or through the Visual Studio SQL Server Database Project tooling — there is no automated deployment pipeline in this repo.

## Organization

Scripts are organized by **feature module**, then by object type:

```
[Module]/
  DDL/              # Schema changes (ALTER TABLE, CREATE INDEX, etc.), numbered by work item
  DML/              # Data updates, numbered by work item
  STOREPROCEDURE/   # Stored procedures
  FUNCTIONS/        # SQL functions (FN_ prefix)
  VIEWS/            # Views (VW_* prefix)
  TABLES/           # Table definitions
  SYNONYMS/         # Database synonyms
```

Feature modules live under `features/`: `features/employee/`, `features/advance-module/`, `features/travel-and-expense/`, `features/dashboard/`, `features/menu/`, `features/authentication/`, `features/sections/`, `features/pre-onboarding/`, `features/documents/`, `features/notifications/`, `features/security/`, `features/entities/`, and more. Sub-feature operations are further nested (e.g., `features/travel-and-expense/expense-requests/insert/`).

Utility folders (not deployed via `hrms-sql.sqlproj`, and not under `features/`):
- `seeding/` — local/perf-test seed and cleanup scripts
- `troubleshooting/` — ad-hoc PROD diagnostic scripts, organized by feature (`employee/`, `employer/`, `workflow/`, etc.). See `troubleshooting/README.md`.

## Naming conventions

| Object | Convention | Example |
|---|---|---|
| Stored procedures | `SP_*` or `USP_*` + module code | `SP_DB_EmployeeAttendanceDetails`, `USP_ReportBuilderScheduler` |
| Functions | `FN_*` | `FN_ActualHoursWorked` |
| Tables | `T*` PascalCase | `TEmployerDetails` |
| Views | `VW_*` | `VW_PMS_AppraisalSummary` |
| DDL/DML change scripts | `[WorkItemNumber][_Description].sql` | `101037_Alter_SSIS_Temp_TLeaveTypeMaster.sql` |

All identifiers use **PascalCase**. Declare variables at the top of each script. Format SQL line-by-line (one clause per line). When applying DDL/DML change scripts, apply them in ascending work item number order.
