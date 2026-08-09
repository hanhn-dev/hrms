# Dynamic Field Options (`FieldType_JSON_SQL`) Troubleshooting

Scenarios worth checking when a "My Details" / bulk-creation dropdown throws
a SQL error (`String or binary data would be truncated`, a conversion
failure, `Must declare the scalar variable`, etc.) instead of showing its
options list.

## Background

`TEmployeeDetail_Fields.FieldType_JSON_SQL` holds, per field, either a static
JSON options array or a SQL query text that the app layer runs dynamically to
populate a dropdown. Execution path (Node/Sequelize side, not this repo):

- `ORM/Repositories/FieldRepository.js:355-427` (`getFieldsWithOptions`) — decides
  JSON-literal vs. dynamic-SQL per field (`isJSON`), binds `@Name`-style
  parameters via `bindSQLParameters` or the lone `?` placeholder via
  `.replace(/\?/, queryParams.employerId)`, then runs the resulting text.
- `ORM/Utils.js:27-46` (`executeDynamicQuery`) — sends the final text to SQL
  Server via Sequelize with **no** `replacements`/`bind` — i.e. it is fully
  interpolated text by the time it reaches SQL Server.
- `queryParams` only ever carries `employeeId`, `countryId`, `employerId`,
  `sectionId` (see the one live caller, `Features/Employee/BulkProfileUpdate/Utils/Helper.js:357-361`).

A large share of these dynamic queries follow the shape:
```sql
DECLARE @TableVar TABLE (col1 TYPE1, col2 TYPE2, ...)
INSERT INTO @TableVar EXEC SomeExistingMasterSP @EmployerId
SELECT ID, Value AS Value FROM @TableVar WHERE ...
```
— reusing an existing master-data stored procedure instead of duplicating its
business logic. That reuse is intentional (see the RCA doc), but the
`@TableVar` shape is hand-typed and never checked against what the
procedure actually returns until the query runs.

## Scenarios

1. **`String or binary data would be truncated` / conversion failure from an
   `INSERT INTO @TableVar EXEC <proc>` pattern.**
   The declared `@TableVar` column widths/types were guessed (or copied) at
   authoring time and drift out of sync with the master procedure's real
   output as that procedure evolves.

   Confirmed live: `SP_EMPMD_GetEmergencyRelDet`'s `UpdatedBy` column
   (resolved via `Fn_GetEmployeeName`, `VARCHAR(500)`) is inserted into a
   `@Relationships` table variable declaring `UpdatedBy NVARCHAR(100)`.
   `MAX(LEN(Fn_GetEmployeeName(EmployeeId)))` across `TEmployee` is **152**
   today — already past the 100-char cap. Affects the Relationship/Relation
   dropdowns on Family Details, Nomination Details, Emergency Contact
   Details (FieldIDs 138, 166, 233, 85198, and their per-employer copies).

   → `diagnose-fieldtype-json-sql-failures.sql` (section "Truncation risk"),
     full writeup in `rca-fieldtype-json-sql-dynamic-query-failures.md`.

2. **Column-count mismatch from the same `INSERT ... EXEC` pattern, when the
   master procedure has conditional branches that return different shapes.**
   `INSERT INTO @TableVar EXEC proc` only ever validates against whichever
   branch happens to execute — a rarely-hit branch can silently diverge for
   a long time.

   Confirmed live: `SP_Creation_Admin_GetAllEmployeeDetails`'s fallback
   branch (hit when `@EmployeeID` is supplied but the employer has **zero
   active employees**) returns 7 columns; the `@FunctionalManager` table
   variable declares 9. 20+ real employers currently have zero active
   employees, so opening "Add Employee" for any of them and loading the
   Reporting/Functional/Review Manager dropdowns (FieldIDs 307, 309, 310)
   throws immediately.

   → `diagnose-fieldtype-json-sql-failures.sql` (section "Column count
     mismatch" and the branching-heuristic flag in section "Procs needing
     manual review"), full writeup in the RCA doc.

3. **`Must declare the scalar variable '@X'`.**
   `bindSQLParameters` (`ORM/Utils.js:216-236`) silently leaves any `@Token`
   untouched if it doesn't match a key on the caller's `queryParams` object
   (case-insensitively). Since the only supplied keys are `EmployerId`,
   `EmployeeId`, `CountryId`, `SectionId`, any row using a different
   parameter name fails this way. No live occurrence found as of this
   writing (every `@`-parameterized row currently only uses those four
   names) — this is a landmine for the *next* row someone authors with a
   typo'd or unsupported parameter name, not a confirmed current bug.

   → `diagnose-fieldtype-json-sql-failures.sql` (section "Unresolved
     parameter").

4. **`?` positional placeholder bound to the wrong value.**
   `field.Options.replace(/\?/, queryParams.employerId)` always substitutes
   the first `?` with `employerId`, regardless of which column it actually
   sits next to. All 418 current `?`-rows happen to filter `EmployerID=?`,
   so this is consistent today, but nothing enforces that a future `?` row
   means the same thing.

   → `diagnose-fieldtype-json-sql-failures.sql` (section "Positional `?`
     placeholder").

5. **Master procedure is `WITH ENCRYPTION` — the contract can't be eyeballed.**
   Several education/certification-section master procs
   (`SP_CM_GetEstablishmentType`, `SP_CM_GetEstablishmentName`,
   `SP_CM_GetUniversityDet`, `SP_EMPMD_GetQualificationName`,
   `SP_GetQualificationLevel`, `SP_CM_GetSubjectDetails`,
   `SP_CM_GetMajorFields`, `SP_CM_GetMinorFields`, `SP_CM_GetCertificationDet`,
   `SP_EC_GetCategoryListDetails`, `SP_EMPMD_GetEmpNominationCategory`) return
   `NULL` from `sys.sql_modules.definition`, so whoever wrote the matching
   `@TableVar` declaration had to guess. Note: `sys.dm_exec_describe_first_result_set_for_object`
   works on these regardless of encryption (it doesn't read the stored
   text), so the diagnostic script *can* still validate them.

   → `diagnose-fieldtype-json-sql-failures.sql` covers these the same as any
     other target procedure; no special-casing needed.

## Mitigation approach

Existing master stored procedures are **not** to be modified as part of this
mitigation (reuse of their logic is intentional — see the RCA doc for why).
The fix therefore lives entirely on the `FieldType_JSON_SQL` side:

- **Primary fix (width/truncation class):** widen every text column in a
  `@TableVar` declaration to `NVARCHAR(MAX)`/`VARCHAR(MAX)` instead of a
  guessed fixed length. This has no measurable performance cost at this
  scale (small lookup lists, already cached ~10 min app-side) and makes
  truncation structurally impossible regardless of how the source column
  grows. Leave `INT`/`DATETIME`/`BIT`/`CHAR(1)` columns as-is.
- **Column-count / shape-mismatch class:** not preventable purely from the
  `FieldType_JSON_SQL` side without touching the master proc. Use
  `diagnose-fieldtype-json-sql-failures.sql` to detect drift (including the
  branching heuristic) before a user hits it, and re-run it whenever a
  reused master proc changes.
- **Parameter-binding class:** when authoring a new `FieldType_JSON_SQL` row,
  only use `@EmployerId`, `@EmployeeId`, `@CountryId`, `@SectionId` — those
  are the only keys the app layer ever supplies.

Full detail and reasoning: `rca-fieldtype-json-sql-dynamic-query-failures.md`.

## Scripts in this folder

| Script | Type | Scenario(s) |
|---|---|---|
| `diagnose-fieldtype-json-sql-failures.sql` | read-only | 1, 2, 3, 4, 5 |
