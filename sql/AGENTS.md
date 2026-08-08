# Project Introduction

## Project Overview

This project is about database system of HRMS Application, it contains most of the logic for querying the database including Plain SQL, Stored Procedures, Views, Functions, Triggers, etc.

## Coding Style

- Use PascalCase for all table names, column names, and procedure names.
- Define all the variables in the beginning of the script.
- Use the latest version of SQL Server.
- For the SQL code line by line

## Project Structure

- `features/` contains the features of the project organized by folders.
- In each feature folder, there are some scripts or sub folders for sub features.
- Most of `.sql` files are store procedures.
- All folder names use **kebab-case** (e.g. `advance-module/`, `travel-and-expense/`). `.sql` file names stay as-is (often matching the stored procedure name), and SQL identifiers inside scripts still use PascalCase.
- `troubleshooting/` holds ad-hoc PROD diagnostic scripts (not deployed via `hrms-sql.sqlproj`), organized by feature area.
