# RCA: `FieldType_JSON_SQL` dynamic queries fail with truncation / conversion / missing-parameter errors

| | |
| --- | --- |
| **Status** | Root causes confirmed and reproduced against live data for two cases. Several more risk classes identified but not yet triggered. **No code change applied — existing master stored procedures are intentionally not being modified.** |
| **Affected objects** | `TEmployeeDetail_Fields.FieldType_JSON_SQL` (data column, not schema); consuming code `ORM/Repositories/FieldRepository.js`, `ORM/Utils.js` (Node app, `HRMS.CoreAPI/HRMS.Core.WebAPI.Node`) |
| **Symptom** | Dropdown/options lookups on "My Details" and employee-creation screens fail with `String or binary data would be truncated`, a data-conversion error, or `Must declare the scalar variable '@X'`, instead of returning options. |
| **Verified against** | `HRM-CL-Prod` (via read-only queries against `TEmployeeDetail_Fields` and system catalogs/DMVs) |
| **Related scripts** | `diagnose-fieldtype-json-sql-failures.sql` (this folder) |

## Summary

Many `FieldType_JSON_SQL` rows exist specifically to **reuse** an existing
master-data stored procedure rather than reimplement its business logic —
so that when someone improves the master procedure, every dropdown built on
top of it improves too, with no separate maintenance. The mechanism used to
do this is:

```sql
DECLARE @TableVar TABLE (col1 TYPE1, col2 TYPE2, ...)
INSERT INTO @TableVar EXEC SomeExistingMasterSP @EmployerId
SELECT ID, Value AS Value FROM @TableVar WHERE ...
```

The reuse goal is sound. The mechanism is fragile: `INSERT INTO @TableVar
EXEC proc` requires the caller to **predeclare** the exact shape (column
count, order, type, and width) the procedure will return, and SQL Server
only checks that declaration against reality at the moment the statement
runs. Nothing ties the two together at authoring time — the declaration is
free text inside a data column, guessed or copied once and then never
revisited as the master procedure evolves. Two concrete failures from this
have been confirmed live; several more risk classes exist but haven't (yet)
been triggered by real data.

## Where the bugs are

### Bug 1 — width drift: `SP_EMPMD_GetEmergencyRelDet` → truncation

`FieldType_JSON_SQL` for the Relationship/Relation dropdowns (Family
Details, Nomination Details, Emergency Contact Details — FieldIDs 138, 166,
233, 85198, and one copy per employer beyond those) declares:

```sql
DECLARE @Relationships TABLE (
    ID INT, Relationship NVARCHAR(100), UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME, IsActive CHAR(1)
)
INSERT INTO @Relationships EXEC SP_EMPMD_GetEmergencyRelDet @EmployerId
SELECT ID, Relationship AS Value FROM @Relationships WHERE IsActive = 'Y'
```

`SP_EMPMD_GetEmergencyRelDet` resolves `UpdatedBy` through
`[dbo].[Fn_GetEmployeeName](UpdatedBy)`, and `Fn_GetEmployeeName` is declared
`RETURNS VARCHAR(500)`. Reproduced against live data:

```sql
SELECT MAX(LEN(dbo.Fn_GetEmployeeName(EmployeeId))) FROM TEmployee
-- => 152
```

152 > 100. Any relationship-master row whose `UpdatedBy` resolves to a name
over 100 characters throws `String or binary data would be truncated in
table '@Relationships', column 'UpdatedBy'` on the `INSERT`, before the
final `SELECT` (which doesn't even project `UpdatedBy`) ever runs.

### Bug 2 — shape drift across branches: `SP_Creation_Admin_GetAllEmployeeDetails` → column-count mismatch

`FieldType_JSON_SQL` for ReportingManager / FunctionalManager / ReviewManager
(Section 14, FieldIDs 307, 309, 310, one copy per employer) declares:

```sql
DECLARE @FunctionalManager TABLE (
    ID INT, EmployeeId INT, Name NVARCHAR(300), Title NVARCHAR(300),
    Employerid INT, EmployerName NVARCHAR(300), EmploymentNumber NVARCHAR(300),
    EmailId NVARCHAR(300), EmpName NVARCHAR(300)
)
INSERT INTO @FunctionalManager EXEC SP_Creation_Admin_GetAllEmployeeDetails @EmployerId, Null, @EmployeeId
SELECT ID, NAme AS Value FROM @FunctionalManager
```

9 columns declared. `SP_Creation_Admin_GetAllEmployeeDetails` has a fallback
branch (the block marked `-- case added for 82813`, reached when
`@EmployeeID` is supplied but the employer has zero active (`'Y'`)
employees) whose `SELECT` omits `Title` and `EmploymentNumber`:

```sql
Select a.EmployeeId As ID, a.EmployeeId AS EmployeeID,
       [dbo].[FN_GetEmployeeOrgName](ED.IsCrossReportingApplicable,a.EmployeeId) As Name,
       ED.EmployerId, ED.EmployerName, a.EmailId,
       [dbo].[FN_GetEmployeeOrgName](ED.IsCrossReportingApplicable,a.EmployeeId) as EmpName
From TEmployee a WITH (NOLOCK)
INNER JOIN TEmployerDetails ED WITH (NOLOCK) ON a.EmployerID=ED.EmployerId
WHERE a.IsActive = 'P' AND a.Employerid=@EmployerId AND (...)
```
— 7 columns. `INSERT ... EXEC` fails outright on a column-count mismatch
whenever this branch is the one that actually executes. Reproduced against
live data — employers currently with **zero active employees** (a
non-exhaustive sample; there may be more):

| EmployerId | EmployerName |
| --- | --- |
| 0 | DefaultEmployer |
| 69 | QMPL |
| 72 | Valuecent Consultancy Private Limited |
| 75 | TDGwbs |
| 78 | TDG0yy |
| 86 | TensorIoT Software Services Private Limited |
| 89 | JCB CARD International Pvt Ltd |
| 113 | Kunvarji Group 1 |
| 115 | Kunvarji Group 3 |
| 178 | SAITECH MANPOWER SERVICES PVT LTD |
| 198 | new test employer header |
| 201 | Org with Header Footer def |
| 209 | New Org 13 |
| 213 | tesla_test-1 |
| 215 | digital-test-5 |
| 218 | cvd infotech |
| 221 | espam |
| 229 | Zenith Analytics Inc. |
| 66 | LABOUR CONTRACT 1-VIGNAHARTA |
| 67 | LABOUR CONTRACT 2-VAISHNAVI |

Opening "Add Employee" for any of these and loading the manager dropdowns
throws immediately.

## Other risk classes found (not yet confirmed as live failures)

- **`USP_Get_ShiftGroupDetails` → `ShiftName` column.** Built via
  `STUFF(...FOR XML PATH...)`, an unbounded comma-joined string, inserted
  into `@ShiftGroups.ShiftName Varchar(1000)` (FieldID 90431, ShiftGroup
  dropdown, Section 14). Today's largest shift group produces ~290
  characters — safe for now, but there's no structural ceiling, so this
  will truncate once a group accumulates enough shifts.
- **`Sp_Creation_ShiftDetails` → `Filter` column type inconsistency.** Its
  two `IF`/`ELSE` branches return `Filter` as `varchar` (ShiftGroupName) in
  one branch and `int` (ShiftId) in the other, while the declared
  `@ShiftMasterdetails.Filter` is `Varchar(100)`. Both widen into varchar
  without error, so this isn't currently a failure — but it is a design
  smell worth knowing about if this proc is touched again.
- **Encrypted source procedures** (`SP_CM_GetEstablishmentType`,
  `SP_CM_GetEstablishmentName`, `SP_CM_GetUniversityDet`,
  `SP_EMPMD_GetQualificationName`, `SP_GetQualificationLevel`,
  `SP_CM_GetSubjectDetails`, `SP_CM_GetMajorFields`, `SP_CM_GetMinorFields`,
  `SP_CM_GetCertificationDet`, `SP_EC_GetCategoryListDetails`,
  `SP_EMPMD_GetEmpNominationCategory`) return `NULL` from
  `sys.sql_modules.definition`, so their matching `@TableVar` declarations
  were written without being able to see the real output shape. No
  confirmed mismatch found for these (their naming pattern matches sibling
  non-encrypted procs that were fine), but this is exactly the kind of
  blind-guess situation that produced Bug 1.
- **Unresolved `@Token` parameters** and **`?` placeholder bound to the
  wrong column** — see `README.md` scenarios 3 and 4. No live occurrence
  found as of this writing.

## Why this pattern is fragile

`INSERT INTO @TableVar EXEC proc` has no compiler-enforced link between the
declared shape and the procedure's actual output. Three separate things can
drift out from under a `FieldType_JSON_SQL` row without any signal until it
executes:
1. **Width** — a column widened at the source (e.g. `Relationship
   VARCHAR(100)` → `VARCHAR(200)`, or a function's return type) makes a
   previously-safe declared width too narrow.
2. **Column count / order** — a procedure with conditional branches can
   return a different column list depending on which branch executes;
   `INSERT ... EXEC` only validates against whichever branch actually ran.
3. **Type category** — a column's meaning can change (e.g. a raw ID
   replaced with a resolved display string) without the declared type
   changing to match.

Because the same query text is duplicated once per employer (confirmed:
~5,648 rows across ~21 distinct templates), any one of these drifts affects
every employer using that template simultaneously.

## Constraint: existing stored procedures are not being modified

The reuse of master procedures via `INSERT ... EXEC` is a deliberate
decision (avoid reimplementing business logic; changes to a master
procedure should propagate to dropdowns automatically) and is being kept.
Refactoring the reused logic into a shared inline table-valued function or
view — which would remove the width-drift class structurally, since a
function's output shape is inferred from its `SELECT` rather than
predeclared — was considered and rejected for this reason: it requires
turning the master procedure into a thin wrapper around the shared object,
which counts as modifying the existing procedure.

## Recommended mitigation (no procedure changes)

**Primary fix — over-provision text columns, stop guessing widths.**
Replace every text column's declared width in a `@TableVar` with
`NVARCHAR(MAX)` / `VARCHAR(MAX)`. This is a `FieldType_JSON_SQL`-only edit:

```sql
-- before (breaks when the source Relationship/UpdatedBy value outgrows 100 chars)
DECLARE @Relationships TABLE (
    ID INT, Relationship NVARCHAR(100), UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME, IsActive CHAR(1)
)

-- after (structurally immune to width growth, zero SP changes)
DECLARE @Relationships TABLE (
    ID INT, Relationship NVARCHAR(MAX), UpdatedBy NVARCHAR(MAX),
    UpdatedDate DATETIME, IsActive CHAR(1)
)
```
Leave `INT`/`DATETIME`/`BIT`/`CHAR(1)` columns as their natural types —
those aren't subject to the "someone widened a varchar" failure mode.

*Performance:* negligible for this workload. SQL Server stores
`NVARCHAR(MAX)` in-row (not as a LOB page) as long as the actual value stays
under ~8000 bytes, which every value here does — these are names/labels, not
documents. The only real cost is a more conservative memory-grant estimate
by the optimizer for statements touching a MAX column; at the row counts
here (dozens of rows, cached ~10 minutes app-side by
`executeDynamicQuery`'s `NodeCache`), this is not observable.

**What this does not fix:** Bug 2's class (column-count / shape mismatch
across a procedure's branches) has no width to widen — there's nothing to
over-provision when a column is missing entirely. This class cannot be
prevented purely on the `FieldType_JSON_SQL` side without either touching
the master procedure or bypassing static shape declaration altogether (e.g.
`OPENQUERY` against a loopback linked server, which maps by column name
instead of position/width — considered but not adopted here due to the
one-time linked-server setup, per-call connection overhead, and the fact
that it still doesn't fully solve procedures whose result shape genuinely
varies by branch). For this class, detection replaces prevention — see
below.

## Detection: `diagnose-fieldtype-json-sql-failures.sql`

Run this script (read-only; it only creates/drops objects in `tempdb`) to
get a report of:

- Every check below has its own `@Check_*` on/off flag at the top of the
  script — flip one to `0` if you only care about the failure class matching
  the error text you actually got, rather than reading every result set.
- `FieldType_JSON_SQL` rows using a parameter token the app layer will never
  resolve (`Must declare the scalar variable` risk).
- Rows using the `?` positional placeholder (always bound to `employerId`).
- For every `INSERT INTO @TableVar EXEC <proc>` template found: the declared
  column list is fed through SQL Server's own DDL parser (via a scratch
  `CREATE TABLE` in a session-scoped global temp table) and compared
  **positionally** — matching how `INSERT...EXEC` actually binds — against
  the target procedure's live result-set shape from
  `sys.dm_exec_describe_first_result_set_for_object` (this works even on
  `WITH ENCRYPTION` procedures, since it doesn't read the stored source
  text). Flags column-count mismatches, width-too-narrow cases, and
  type-category mismatches.
- For the width check specifically: a declared width narrower than a
  source column's declared TYPE is only a *theoretical* risk — the DMV's
  `max_length` is a ceiling, not what the data actually contains today.
  Where the DMV can trace an output column back to a single real table
  column (`source_schema`/`source_table`/`source_column`), the script also
  runs `MAX(LEN(...))` against that real column across the whole table
  (not scoped to one employer, since the same template is reused by every
  employer pointing at it) and reports whether truncation is happening
  **today**, and by how many characters, versus merely being possible in
  the future. Columns that are the result of an expression or function
  call (e.g. `Fn_GetEmployeeName(UpdatedBy)`, Bug 1 below) can't be traced
  to a single source column this way and are reported as "cannot verify
  automatically" rather than guessed.
- Procedures with `IF`/`ELSE` branches containing separate `SELECT`
  statements are flagged for manual review regardless of what the DMV
  reports for its one inferred shape, since a procedure's live shape can
  vary by branch in a way this (or any static) analysis may not fully see —
  this is exactly how Bug 2 would otherwise be missed by the automated
  column-count check alone.

Re-run this script whenever a master procedure that's reused by any
`FieldType_JSON_SQL` row changes, since that's the actual trigger for this
entire bug class.

## How to verify

Run `diagnose-fieldtype-json-sql-failures.sql` with `@EmployerId = NULL` for
a full scan, or set it to a specific employer to scope the check. The
"Truncation risk" and "Column count mismatch" sections should reproduce
Bugs 1 and 2 above; the "Procs needing manual review" section should include
`SP_Creation_Admin_GetAllEmployeeDetails` (branching heuristic) and every
`WITH ENCRYPTION` procedure in the current template set.
