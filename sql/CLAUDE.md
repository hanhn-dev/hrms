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

Top-level modules: `Employee/`, `AdvanceModule/`, `TravelAndExpense/`, `Dashboard/`, `Menu/`, `Authentication/`, `Sections/`, `PreOnboarding/`, `Documents/`, `Notifications/`, `Security/`, `Entities/`, and more. Sub-feature operations are further nested (e.g., `TravelAndExpense/ExpenseRequests/Insert/`).

## Naming conventions

| Object | Convention | Example |
|---|---|---|
| Stored procedures | `SP_*` or `USP_*` + module code | `SP_DB_EmployeeAttendanceDetails`, `USP_ReportBuilderScheduler` |
| Functions | `FN_*` | `FN_ActualHoursWorked` |
| Tables | `T*` PascalCase | `TEmployerDetails` |
| Views | `VW_*` | `VW_PMS_AppraisalSummary` |
| DDL/DML change scripts | `[WorkItemNumber][_Description].sql` | `101037_Alter_SSIS_Temp_TLeaveTypeMaster.sql` |

All identifiers use **PascalCase**. Declare variables at the top of each script. Format SQL line-by-line (one clause per line). When applying DDL/DML change scripts, apply them in ascending work item number order.
