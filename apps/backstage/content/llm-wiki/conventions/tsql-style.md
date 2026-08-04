---
sources:
  - HRMS-DATABASE/HRMS/STOREPROCEDURE
  - HRMS-DATABASE/HRMS/TABLES
confidence: medium
last-analyzed: 2026-06-26
---

# T-SQL Style

Code-style conventions observed in the T-SQL source. (This page replaces the
scaffold's `typescript-style` slot — the project is SQL Server, there is no
TypeScript.)

## File / object layout

- **One object per file**, named exactly as the object (SSDT export style):
  `TEmployee.sql`, `SP_ApproveWorkFlowRequest.sql`.
- Scripts open with `USE [HRMS_PROD]`, `SET ANSI_NULLS ON`,
  `SET QUOTED_IDENTIFIER ON`, separated by `GO` batch terminators.
- **Encoding**: most script files are **UTF-16 (little-endian, with BOM)**. A few
  are ASCII/UTF-8. Tools reading them must handle UTF-16 (plain `grep` over the
  raw bytes will miss content). The harness `Read`/`Grep` tools decode correctly.

## Formatting

- Bracketed identifiers: `[dbo].[TEmployee]`, `[ColumnName]`.
- Keywords appear in mixed case across authors (`SELECT`/`Select`/`select`);
  there is no enforced keyword case.
- Tab-indented bodies; column lists one-per-line in `CREATE TABLE`.
- Defaults and constraints inline in `CREATE TABLE`; indexes added after with
  `GO`-separated `CREATE INDEX`.

## Procedure conventions

- `BEGIN ... END` body, frequent `SET NOCOUNT ON`.
- Local variables `@Lv_*` / `@lv_*` prefix for "local variable"
  (`SP_ApproveWorkFlowRequest.sql:49-79`).
- Validation returns an `ErrorCode`/`ErrorMsg` result set + `RETURN` rather than
  `THROW`/`RAISERROR` for business errors.
- Parameterized dynamic SQL via `sp_executesql` with `OUTPUT` params.
- Change history maintained as comment lines in the header block.

## Things to preserve (don't "fix" in unrelated edits)

- The header change-log comment blocks.
- Existing identifier casing (`Employerid`, `createDate`) — matching the column
  exactly avoids confusion even though casing is inconsistent.
- The UTF-16 encoding of existing files (re-saving as UTF-8 would show as a noisy
  whole-file diff).

> No linter/formatter config (e.g. SQL Prompt settings) is committed; style is
> by-convention and varies by author. See `../assumptions/open-questions.md`.
