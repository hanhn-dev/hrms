# RCA: Bulk Upload Records Stuck "Unprocessed" With No Useful Reason

| | |
| --- | --- |
| **Status** | Eight distinct root-cause patterns confirmed against source and live data. **No fix applied yet.** |
| **Affected objects** | `SP_BulkUpdateProfile_Process_Template`, `SP_BulkUpdateProfile_UpdateEmployeeDetails` (+ 12 sibling `SP_BulkUpdateProfile_ProcessEmployees*Information`/`Update*` section procs), `SP_BulkCreationProfile_Process_Template`, `SP_BulkEmployeeCreationDetails`, `TEmployeeDetail_Upload`, `TEmployeeDetail_Upload_Section`, `TProcessedBatchResult` |
| **Symptom** | Employees/records end up "Unprocessed" on Bulk Profile Update or Bulk Employee Creation; the on-screen reason is almost always the generic *"The Records Were Unprocessed Due To An Internal Server Error."* |
| **Verified against** | Live default connection, 2026-08-09 |
| **Related scripts** | `diagnose-bulk-upload-unprocessed-records.sql`, `find-stuck-and-inconsistent-bulk-uploads.sql` (this folder) |

## Summary

Both features feed one pipeline: the web tier stages rows into
`TEmployeeDetail_Upload` (one row per upload) and
`TEmployeeDetail_Upload_Section` (per-section `Total`/`Valid`/`InValid`/
`Processed`/`UnProcessed` counts), then `SP_BulkUpdateProfile_Process_Template`
/ `SP_BulkCreationProfile_Process_Template` is called once per batch and fans
out to one stored procedure per section (Personal Details, Bank Details,
Contact Details, ...). Every result — success or failure, per record — is
appended as JSON into `TProcessedBatchResult.Result` and merged back into
`TEmployeeDetail_Upload_Section`.

There is no single bug. Eight independent defects in this pipeline each
produce an "Unprocessed" outcome with a vague or entirely absent explanation.
They stack: a given ticket may be hit by more than one at once.

## Where the bugs are

### 1. Poisoned `@ErrorMessage` cursor variable (Bulk Profile Update only)

`SP_BulkUpdateProfile_UpdateEmployeeDetails.sql:115-116,127-130` (Personal
Details section — the pattern is structurally identical, per source
inspection, in all 12 sibling `SP_BulkUpdateProfile_ProcessEmployees*
Information` / `Update*` procs):

```sql
BEGIN CATCH
    ...
    DECLARE @ErrorMessage NVARCHAR(4000);   -- line 115: only reached when THIS row fails
    SET @ErrorMessage = ERROR_MESSAGE()     -- line 116
    ...
END CATCH

IF @ErrorMessage IS NOT NULL                -- line 127: runs after EVERY row, success or not
BEGIN
    SET @UnProcessedIDs = @UnProcessedIDs + '{"EmployeeId":' + ... +
        '"ErrorMessage":["The Records Were Unprocessed Due To An Internal Server Error."]},'
END
```

`@ErrorMessage` is declared inside `CATCH`, not once at the top of the
procedure. In T-SQL, `DECLARE` doesn't reset on loop re-entry the way a local
variable would in a procedural language — once any row in the cursor fails,
`@ErrorMessage` holds that failure's text for the rest of the batch. The
`IF @ErrorMessage IS NOT NULL` check at line 127 runs unconditionally after
every iteration, so **every row after the first failure gets appended to
`@UnProcessedIDs` too — even rows whose `TRY` block succeeded and were
already added to `@ProcessedIDs`.** The record ends up in *both* the
Processed and Unprocessed arrays for that batch, tagged with a message that
has nothing to do with it.

Confirmed **not** present in Bulk Employee Creation's equivalent —
`SP_BulkEmployeeCreationDetails.sql:228` explicitly resets
`SET @ErrorMessage = NULL` after handling each failure, so this specific
defect is Bulk Profile Update only.

### 2. The message shown to the user is always the same generic string

Both features: `SP_BulkUpdateProfile_UpdateEmployeeDetails.sql:113,129`,
`SP_BulkEmployeeCreationDetails.sql:203,225` (and the 12 profile-update
siblings, per code inspection) capture the *real* SQL error —
`ERROR_MESSAGE()`, `ERROR_LINE()`, proc name, employee/work-email context —
and insert it into `TSQL_Errorlogs`. But the JSON attached to the
Unprocessed record for the UI is hardcoded to
`"The Records Were Unprocessed Due To An Internal Server Error."` regardless
of what the real exception was. `TSQL_Errorlogs` has no `UploadID` column —
the only link back to an upload is a free-text `ParamterValue` column
(`' EmployeeID= 123 AND EmployeeID= 456 '`-style text) plus timestamp
proximity. This is almost certainly the core reason the reasons look vague:
**the real cause exists in the database, just not anywhere the UI reads.**

### 3. One generic duplicate message masks two different causes (Bulk Employee Creation)

`SP_BulkEmployeeCreationDetails.sql:250` and `:275` are two separate
`EXISTS` checks — "Work Email already belongs to an active employee
(`TEmployee`)" vs. "Work Email is already staged from a *different* in-flight
upload (`Temployeedetail_Staging_Employee_creation`)" — that both emit the
byte-identical message *"The Records Were Unprocessed Due To Work Email
Already Exists."* There's no way to tell from the UI which case actually
applied.

### 4. `UnProcessed` counter is overwritten, not accumulated, across batches (Bulk Profile Update)

`SP_BulkUpdateProfile_UpdateEmployeeDetails.sql:143`:

```sql
UPDATE Temployeedetail_Upload_Section WITH(ROWLOCK)
SET Processed  = ISNULL(Processed,0) + (SELECT COUNT(Processed)   FROM #TotalRecords),  -- additive
    UnProcessed =                       (SELECT COUNT(UnProcessed) FROM #TotalRecords), -- NOT additive
    ...
```

Large uploads are paginated into multiple batches. `Processed` correctly
accumulates across calls; `UnProcessed` is replaced by only the current
batch's count each time. On a multi-batch upload, the section's visible
`UnProcessed` figure reflects only the *last* batch — earlier batches'
failures are silently dropped from the count (though the individual JSON
entries do still exist in `TProcessedBatchResult.Result` for each batch).
Contrast `SP_BulkEmployeeCreationDetails.sql:294`, which does this correctly
(`UnProcessed = ISNULL(UnProcessed,0) + ...`) — so Bulk Employee Creation is
not affected by this specific defect, only Bulk Profile Update.

### 5. Duplicate-batch guard silently no-ops but can still mark the upload "Processed"

`SP_BulkUpdateProfile_Process_Template.sql:65-196,262-271`:

```sql
If not exists (select 1 from TProcessedBatchResult
               where UploadID=@uploadid and Batchnumber=@batchno and UploadSectionID=@UploadSectionID)
Begin
    -- ... all 13 section IF/EXISTS branches, the only place any real work happens ...
END
-- @ProcessedRecords is still '' if the block above was skipped
...
Insert into TProcessedBatchResult (...) Values (..., @ProcessedRecords, ...)   -- inserts '[]' either way
...
If @Isdone = 1
    UPDATE TEMPLOYEEDETAIL_UPLOAD SET ProcessedResult = @ProcessedRecords, Status = 'Processed', ...
```

If a `TProcessedBatchResult` row already exists for this exact
`UploadID + Batchno + UploadSectionID` (retry, double-submit, browser resend),
the entire processing block is skipped — but the code after it runs
unconditionally regardless: another `TProcessedBatchResult` row is inserted
with an empty `Result`, and if the caller passed `@Isdone = 1`, `Status` is
still set to `'Processed'`. **The final "Processed" status is driven purely
by the `@Isdone` flag the app passes in, not by whether this call actually
did anything.**

### 6. Unmapped `SectionID` produces the identical silent no-op

Same procedure, lines 74-191: the dispatch to a section's processing proc is
a chain of 13 hardcoded `IF EXISTS (SELECT 1 FROM TEmployeeDetail_Section
WHERE SECTION='<name>' AND SECTIONID=@SectionID)` checks. If `@SectionID`
doesn't match any of them (stale mapping, a new section added to
`TEmployeeDetail_Section` without updating this procedure), nothing executes
— same empty-result, same possible `Status='Processed'` outcome as pattern 5,
with no error anywhere.

### 7. `Status='Processed'` reflects the caller's flag, not the batch's actual outcome

`SP_BulkUpdateProfile_Process_Template.sql:240-271`: the outer `CATCH`
(catching anything not already swallowed inside a section sub-proc's own
`TRY/CATCH`) resets `@ProcessedRecords = '[]'` and logs `'Failure'`, but the
`UPDATE TEMPLOYEEDETAIL_UPLOAD ... Status='Processed'` at line 264 sits
**after** both the `TRY` and `CATCH` paths, gated only on `@Isdone=1`. A
batch that hit the outer `CATCH` can still be marked `Processed` if it
happened to be flagged as the last batch.

### 8. Bulk Employee Creation's Personal Details step is silently gated on section 14 having data

`SP_BulkEmployeeCreationDetails.sql:89`:

```sql
Select @EmployeeData2 = Section_JSON from Temployeedetail_Upload_Section Where Uploadid=@UploadID and Sectionid=14
```

`SectionID=14` is hardcoded rather than derived from the `@SectionID`
parameter. Per `TEmployeeDetail_Section`, **SectionID 14 is "Current
Employment Details"**, not Personal Details. The proc uses this to build a
combined valid/invalid flag: a Personal Details record is only treated as
processable if the *same employee's* Current Employment Details record is
also valid (lines 96-106) — a real cross-section business rule, not a typo.
But if section 14's `Section_JSON` for this `UploadID` is `NULL` or hasn't
been saved yet (interrupted session, a save call for that tab failing
independently), `#employeedata` ends up empty and the cursor at line 109
iterates **zero rows** — every Personal Details record in the batch is
silently neither processed nor logged as Unprocessed. No exception, no log
entry, nothing in `TProcessedBatchResult` for those records at all.

### 9. `TEmployeeDetail_Upload.ErrorMessage` is a dead column

Neither orchestrator (`SP_BulkUpdateProfile_Process_Template` nor
`SP_BulkCreationProfile_Process_Template`) ever writes to
`TEmployeeDetail_Upload.ErrorMessage`. Whatever this column was designed to
surface, it doesn't happen today.

### 10. NULL-poisoning via string concatenation silently drops the ENTIRE Personal Details record (both features) — confirmed live on 23% of tenants

`FN_BulkUpdateProfile_BuildPersonalDetail_UpdateSQL.sql:92-93` (Bulk Profile
Update) and `FN_BulkCreateProfile_BuildInsertDetailsSQL.sql:102,112` (Bulk
Employee Creation) both do this for `Language Read`/`Language Write`/
`Language Speak` fields:

```sql
SET @FieldValue = dbo.Ufn_BulkProfile_languageNamestoIds(@FieldValue, @EmployerID)
SET @UpdateSQL += QUOTENAME(@ColumnName) + ' = ''' + @FieldValue + ''', '   -- (Insert: @InsertSQL += ''''+@FieldValue+''',')
```

Both `@UpdateSQL`/`@InsertSQL` are accumulator variables built with `+=`
across the *entire* field-list loop. SQL Server's default
`CONCAT_NULL_YIELDS_NULL` setting means concatenating a `NULL` onto a string
makes the **whole string** `NULL` from that point forward — not just the one
field. If the language lookup finds no match, it returns `NULL`, and the
*entire in-progress SQL statement for that employee* collapses to `NULL`.
The final check (`IF LEN(@UpdateSQL) > LEN('UPDATE dbo.TEmployee SET ')`)
evaluates `LEN(NULL)` → `NULL` → falsy, so the function explicitly returns
`NULL` (line 125/133), and the caller's `IF @UpdateSQL IS NOT NULL` gate
never fires. **Every field for that employee — not just the language one —
silently does nothing. No error, no `TSQL_Errorlogs` entry, no Unprocessed
flag, no `#TotalRecords` row. Nothing.**

Root trigger, confirmed: `Ufn_BulkProfile_languageNamestoIds.sql` resolves
language names via
`SELECT STRING_AGG(LanguageId,',') FROM tlanguage WHERE Languagename IN (...) AND Employerid=@Employerid`
— **with no fallback to a global/`EmployerId=0` row**, unlike every other
lookup in this pipeline (which uses `Employerid IN (0,@EmployerID)`).
Confirmed live (2026-08-09): **48 of 212 active employers (23%) have zero
rows in `TLanguage`**. For those tenants, *any* non-blank Language
Read/Write/Speak value in a Personal Details bulk upload guarantees this
failure, 100% of the time. For the other 164 employers, it still fires
whenever the submitted text doesn't exactly match a seeded `Languagename`
(typo, unseeded language). This is very likely one of the single largest
contributors to "Unprocessed with no reason" tickets — it's invisible by
design, since no exception is ever thrown.

### 11. No length/format validation anywhere in the write path

`FN_BulkUpdateProfile_GetFieldValueFromJSON.sql` — confirmed to be nothing
but `JSON_VALUE(@EmployeeData, '$[i]."FieldName"')`, with zero length or type
checking. Every one of the ~20 section-builder functions
(`FN_BulkUpdateProfile_Build[Insert|Update]<Section>DetailsSQL`) takes that
raw value, escapes quotes, and concatenates it as a string literal into
dynamic SQL — no `LEN()` guard against the target column's max length, no
explicit `CAST`/`TRY_CONVERT` to the target type. An over-length value or a
malformed date/number is only caught when `sp_executesql` actually executes
and SQL Server throws — which the section proc's TRY/CATCH does catch and
log to `TSQL_Errorlogs`, feeding the generic message from pattern 2. So this
specific "value too long" scenario is not a *silent* loss like pattern 10 —
but it's indistinguishable from any other SQL error without reading
`ERROR_MESSAGE()` from `TSQL_Errorlogs` directly (Section H of
`diagnose-bulk-upload-unprocessed-records.sql` covers this).

### 12. `SP_BulkUpdateProfile_ProcessEmployeeBankDetails`'s insert-branch condition is broken

`SP_BulkUpdateProfile_ProcessEmployeeBankDetails.sql:71`:

```sql
IF ((@BankDetailID IS NULL) OR (@BankDetailID='') AND @BankDetailID NOT IN (select 1 from TEmployeeBankDetails where BankDetailId = @BankDetailID))
```

Verified empirically against this database: `CAST('' AS INT)` returns `0`
(does not error), so `@BankDetailID=''` is really `@BankDetailID=0`. Also,
the subquery selects the literal `1`, not `BankDetailId` — so
`NOT IN (SELECT 1 FROM ... WHERE BankDetailId=@BankDetailID)` doesn't
actually check "does this ID already exist"; it checks "does `@BankDetailID`
differ from the literal `1`," which is true for almost any value — a
vacuous, meaningless check. Net effect: the INSERT branch works fine for the
common case (`@BankDetailID` `NULL` or `0`/blank — a genuinely new record).
But when the Excel/JSON sends a **non-null, non-zero `BankDetailID` that
doesn't match any existing row for this employee** (a stale ID from a
previously deleted bank record, or a copy-paste error referencing another
employee's numeric ID), the whole `IF` is `FALSE` — **neither INSERT nor
UPDATE fires. No error, no Unprocessed flag, no `#TotalRecords` row.** The
record vanishes with zero trace, specifically for this "reused/stale
non-matching ID" case.

### 13. `SP_BulkUpdateProfile_ProcessEmployeesSkillsInformation`'s cursor FETCH does an unguarded implicit string→INT conversion, outside TRY/CATCH

`SP_BulkUpdateProfile_ProcessEmployeesSkillsInformation.sql:45,54-60,114`:
`DECLARE @SkillID INT` is populated directly from
`JSON_VALUE(value,'$."Skill Name"')` via
`FETCH NEXT ... INTO @EmployeeID, @SkillID, @IsValid`. Both `FETCH`
statements (the initial one and the loop one) sit **outside** the
`BEGIN TRY` block. If `"Skill Name"` is ever non-numeric text, the `FETCH`
itself throws an unhandled conversion error that aborts the *entire batch
call* for the Skills section — not just one record — since nothing in this
proc catches it. It's only caught by `SP_BulkUpdateProfile_Process_Template`'s
outer catch-all (pattern 7), which can still let `Status='Processed'` slip
through. Confirmed as a code defect regardless of trigger frequency — worth
checking what the Skills upload template actually sends in that JSON key
before assuming it fires often in practice.

## Confirmed live-data scope (2026-08-09)

Across 931 rows in `TEmployeeDetail_Upload`:

| Status | Count |
|---|---|
| Processed | 631 |
| Validated (potentially stuck — see below) | 214 |
| Created (never even validated) | 86 |

**Stuck at `Validated`** (validation finished, processing never ran to
completion for every batch):

| UploadType | Stuck count | Days stale (min–max) |
|---|---|---|
| BulkProfileUpdate | 137 | 24–632 |
| BulkCreation | 75 | 24–432 |
| BulkImageUpdate | 2 | 298–310 |

**Marked `Processed` with an empty `ProcessedResult`** (pattern 5/6/7 — or,
in some fraction of cases, legitimately zero valid records in every batch):

| UploadType | Empty-result / Total Processed |
|---|---|
| BulkImageUpdate | 51 / 51 (100%) |
| BulkProfileUpdate | 117 / 189 (62%) |
| BulkCreation | 44 / 391 (11%) |

**Section-level arithmetic drift** across 1,779 `TEmployeeDetail_Upload_Section`
rows: 137 (7.7%) have `Total ≠ Valid + InValid`; **525 (29.5%)** have
`Valid ≠ Processed + UnProcessed`.

**`TProcessedBatchResult`**: 3,938 of 5,535 rows (71%) have an empty/NULL
`Result`. **Not all of these are bugs** — a batch can legitimately contain
zero valid records for a given section (nothing to process, correctly
nothing returned). `diagnose-bulk-upload-unprocessed-records.sql` Section E
distinguishes a real silent drop (records submitted as valid, absent from
both Processed and Unprocessed) from a legitimately empty batch (nothing
valid was submitted in the first place) — use it rather than treating this
71% figure as "71% of batches are broken."

Two concrete reproductions used while confirming this:

- `UploadID=1084` (BulkProfileUpdate, EmployerID=10): `Status='Validated'`
  since 2026-07-16 — still stuck as of 2026-08-09, 24 days later.
- `UploadID=1087` (BulkCreation, EmployerID=10): `Status='Processed'`,
  `ProcessedResult='[]'`, `ErrorMessage=NULL` — a completed upload with zero
  queryable trace of what happened to any employee in it.

## Proposed fixes (not applied)

1. Move `DECLARE @ErrorMessage NVARCHAR(4000);` to the top of each affected
   procedure (once, outside the cursor loop) and explicitly `SET
   @ErrorMessage = NULL` at the start of every iteration (mirroring the reset
   Bulk Employee Creation already does) — fixes pattern 1.
2. Persist `ERROR_MESSAGE()` (or a `TSQL_Errorlogs.TerrorId` back-reference)
   into the record's `ErrorMessage` JSON instead of the hardcoded string —
   fixes pattern 2, and would make pattern 3's duplicate check distinguishable
   by SQL error text/constraint name.
3. Make the `UnProcessed` counter update additive
   (`ISNULL(UnProcessed,0) + ...`) in `SP_BulkUpdateProfile_UpdateEmployeeDetails`
   and its 12 siblings, matching `SP_BulkEmployeeCreationDetails` — fixes
   pattern 4.
4. Tie `Status='Processed'` to whether every expected section actually
   produced a result for this batch (e.g. check `@ProcessedSections` isn't
   empty when the batch had valid input), rather than trusting `@Isdone`
   alone — fixes patterns 5/6/7.
5. Derive the "Current Employment Details" `SectionID` from
   `TEmployeeDetail_Section` by name instead of hardcoding `14`, and raise a
   real error (or an Unprocessed entry with an honest reason) when that
   section's `Section_JSON` is missing, instead of iterating zero rows
   silently — fixes pattern 8.

## How to use the scripts in this folder

Run `diagnose-bulk-upload-unprocessed-records.sql` with the `UploadID` from
the ticket (or an `EmploymentNumber`/`WorkEmail` if that's all you have) to
classify which of the 8 patterns explains that specific ticket. Run
`find-stuck-and-inconsistent-bulk-uploads.sql` for a fleet-wide view before
deciding whether a fix is worth prioritizing.
