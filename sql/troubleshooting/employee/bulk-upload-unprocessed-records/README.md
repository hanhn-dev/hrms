# Bulk Upload Records Stuck "Unprocessed" With No Useful Reason

**Scenario:** Bulk Profile Update / Bulk Employee Creation leaves employees in
an "Unprocessed" state, and the "Unprocessed Reasons" shown in the UI is
almost always the generic *"The Records Were Unprocessed Due To An Internal
Server Error."* — no help for troubleshooting.

Both features share one processing pipeline centered on
`TEmployeeDetail_Upload` / `TEmployeeDetail_Upload_Section` /
`TProcessedBatchResult`, driven by `SP_BulkUpdateProfile_Process_Template`
(profile update) and `SP_BulkCreationProfile_Process_Template` (employee
creation), which fan out per section into procs like
`SP_BulkUpdateProfile_UpdateEmployeeDetails` / `SP_BulkEmployeeCreationDetails`.

There isn't one root cause — there are (at least) **13 distinct defects**
in this pipeline that can each independently produce an Unprocessed record
with a vague or missing reason, ranging from a variable-scoping bug that
falsely flags *successful* records as failed, to a NULL-poisoning bug in the
dynamic-SQL builders that silently drops an entire employee record with zero
trace (confirmed to always fire for 23% of tenants whenever a Language field
is submitted — pattern 10). See `rca-bulk-upload-unprocessed-records.md` for
the full write-up with file:line references and confirmed live-data scope.

**Not yet fixed.** These scripts are for classifying which pattern(s) explain
a specific ticket (or the whole install) before requesting a code fix.

## Scripts in this folder

| Script | Type | Purpose |
|---|---|---|
| `diagnose-bulk-upload-unprocessed-records.sql` | read-only | Deep-dive ONE upload (by `UploadID`, or by `EmploymentNumber`/`WorkEmail` for a specific employee) and classify every Unprocessed record against the known patterns. |
| `find-stuck-and-inconsistent-bulk-uploads.sql` | read-only | Fleet-wide scan across all uploads for stuck/empty/drifted results — use this to size the problem or find which tenant/upload to drill into. |
| `rca-bulk-upload-unprocessed-records.md` | doc | Full write-up: all 8 patterns with file:line evidence and confirmed live-data scope. |
