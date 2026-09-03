# Database updates

Living ledger of `HRMS-DATABASE` changes captured by `/track-db-updates`.
SQL in **TDG HRMS DB** is source of truth; this page is the delta since
each run so a knowledge refresh has a bounded input.

> Last run: 2026-09-03 09:54 UTC (`9d3e2a6a5` on `QA`)

## Latest run — 2026-09-03

**Range:** `a804178e5` → `9d3e2a6a5` (`QA`)
**SQL files:** 275 added, 0 removed, 293 modified
**Out of scope:** 101 non-object paths (changelog XML, `llm-wiki/` in the DB repo, `.claude/`, ad-hoc SQL)

First run: `.db-updates-state.json` was missing. Baseline is `apps/backstage/.llm-wiki-sync-state.json` `lastSyncedCommit` (`a804178e5`, 2026-08-08 — `[chore]: Add LLM Wiki`). 370 commits on `QA`; `origin/QA` matches HEAD. No `--pull`. No uncommitted SQL.

Modified stored procedures collapsed below the 80-file rule (272 procedure modifications across modules). New tables, DDL, UDTs, new functions/procs, and wiki-mapped edits are itemized.

### HRMS

| Object | Type | Change | Knowledge |
|---|---|---|---|
| `TLicenseInsight` | TABLE | added — open/closed license-insight rows (`DedupeKey`, rule, severity, usage metrics) | patched `reference/tables/hrms.md`; subsystem listed in `architecture/module-catalog.md` |
| `TLicenseInsightNotification` | TABLE | added — insight send log (no FK to insight) | patched `reference/tables/hrms.md` |
| `TLicenseInsightSetting` | TABLE | added — admin insight-rule thresholds | patched `reference/tables/hrms.md` |
| `tLeaveTypeRules_Abbrevation` | TABLE | added — leave-rule column abbreviation lookup | patched `reference/tables/hrms.md` |
| `TBiometricDevice` | TABLE | unique index on `(EmployerId, ClientMachineId)` now covers inactive devices (was filtered `IsActive = 1`) | unmapped — no catalog row; `--full` would add it |
| `UDT_LicenseInsightSetting` | UDT | added TVP for insight settings | unmapped |
| `UDT_AllowedGroupList` | UDT | added TVP (`GroupName`) | unmapped |
| `TCelebration*` (13 DDL files, work item 161632) | DDL | create celebration broadcast/feed tables (wish, comment, reaction, template, settings, audit, attachments) | unmapped — scripts live under `DDL/`, not `TABLES/` |
| TCOB schema (5 DDL) | DDL | process/template section masters, field types, deploy schema | unmapped |
| Asset status / ownership / dashboard preference (5 DDL) | DDL | parent-child asset status, ownership type, history, dashboard preference | unmapped as catalog rows (no new `TABLES/` files); feature regen Asset Management |
| Document storage (4 DDL) | DDL | `TDocumentStorageMapping`, `TStorageProviderConfiguration`, `TSupportDocumentsMetadata` (+ history) | unmapped |
| `TDashboardSavedView` | DDL | new saved-view table (157802) | unmapped |
| Other HRMS DDL (20 files) | DDL | email templates, leave-type rules / experience-based leave, customer settings, notification flat config, indexes, synonyms, workflow trace, attachment-category flag | unmapped except where named above |
| `UFN_LicenseInsightRules` | FUNCTION | added | unmapped (pairs with new insight tables) |
| `FN_Mydetails_GetFieldDisplayText` | FUNCTION | added — education DisplayText remap helper | feature regen — `/document-feature My Details`; wiki `TEducationDetails` already says “institute” |
| `FN_CM_GetHalfDayLeaveChk`, `FN_CleanWorkflowEmails`, `FN_GetEmailGroups` | FUNCTION | added | unmapped |
| `FN_Mydetails_Enhanced_BuildInserTEmployeeBankDetailsSQL`, `FN_Mydetails_Enhanced_BuildUpdateBankDetailsSQL` | FUNCTION | modified — bank insert/update for old-look after new-look create | reviewed — no claim change |
| `UFN_LA_LeaveType_EmployeeBalanceSummary_Get` | FUNCTION | modified — `EffectiveDate` in balance logic | reviewed — no claim change (`leave-lifecycle.md` already flags stale `TABLES/` vs ledger `EffectiveDate`) |
| `UFN_FreezeAttendance_GetEffectiveFreezeDate` | FUNCTION | modified — freeze-date fix | reviewed — no claim change |
| `UFN_GET_AttendanceCalDateAndShift` | FUNCTION | modified | reviewed — no claim change |
| `fn_AssetDisplayMode` | FUNCTION | modified (observation fix) | reviewed — no claim change |
| other HRMS functions (6 modified) | FUNCTION | location-BU employee details, employee-name helpers, separation reassign reason, email notification address | reviewed — no claim change |
| `SP_InsertAttendanceDataWithMachineID` | STOREPROCEDURE | added — device punch insert keyed by `ClientMachineID` into `TClientAttendanceDataLog` | patched `domain/attendance-lifecycle.md`; feature regen — `/document-feature Attendance` (guide still says the file is missing) |
| `SP_InsertAttendanceData` | STOREPROCEDURE | modified — timezone convert uses `@EmployerID` instead of hardcoded `5` | reviewed — no claim change |
| `SP_Celebration_*` (48) | STOREPROCEDURE | added — celebration feed/broadcast/wish/comment API | unmapped |
| `USP_TCOB_*` / `usp_TCOB_*` (18) | STOREPROCEDURE | added — COB template/process section CRUD | unmapped |
| License insight procs (10) | STOREPROCEDURE | added — `USP_LicenseInsight_*`, `SP_Employer_LicenseInsight_*`, `USP_LicenseInsightSetting_*`, `USP_License_ModuleUsage_Insights` | unmapped beyond table catalog / module-catalog subsystem |
| Deactivation checklist (8) | STOREPROCEDURE | added — `SP_SEP_DeActivateEmployee_BY_ID`, `SP_SEP_GetDeactivationChecklist`, `SP_AdminMstr_Deactivation*`, `SP_GetDeactivationChecklistConfig` | unmapped; feature regen — `/document-feature Separation Tasks` if the live deactivate path moved off `SP_SEP_DeActivateEmployee` |
| `USP_Asset_*` (6) | STOREPROCEDURE | added — asset status history, dashboard status preference | feature regen — `/document-feature Asset Management` |
| `usp_vw_StageHandoff*` (5) | STOREPROCEDURE | added — stage-handoff view procs | unmapped |
| Leave helpers (9) | STOREPROCEDURE | added — leave attachments/history/notification modal, shift-by-date, DOJ anniversary credit, leave-limit validate, payable-days, `SP_AdminLM_DeleteLeaveTypeRules` | feature regen — `/document-feature Leave Management` for attachments/history |
| Biometric (4) | STOREPROCEDURE | added — punch log outcome, push API key, alert candidates | unmapped |
| `USP_OT_Claim_*` (4) | STOREPROCEDURE | added — OT claim popup/notification/reject | unmapped |
| Attendance extras (4) | STOREPROCEDURE | added — auto-present effective-date, recalc wrong check-in/out | unmapped |
| `USP_SaveBank`, `USP_SaveBankBranch` | STOREPROCEDURE | added | unmapped |
| other new HRMS procs (11) | STOREPROCEDURE | added — retirement alerts, employer logo, workflow partial error, geo last-known location, dashboard access, AR advance-setup validate, homepage notification fix, `USP_CM_ValidateWorkflowConfigured`, `USP_GetRequestInfo` | unmapped |
| `SP_GetChangeRequestDetails`, `SP_Mydetails_Enhanced_GetEmpEducationHistoryDetails`, `_Pending` | STOREPROCEDURE | modified — education DisplayText “Establishment” → “Institute” | reviewed — no wiki claim change; feature regen — `/document-feature My Details` |
| `SP_MyDetails_GetEmployeeDetailsForGivenFields`, `Sp_ApproveRejectMyDetailsReview` | STOREPROCEDURE | modified — nomination multi-person / bank old-look | reviewed — no claim change |
| `SP_CM_ApproveWorkFlowRequest`, `SP_CM_RejectWorkFlowRequest` | STOREPROCEDURE | modified (file encoding/size; PR “Changes Done”) | reviewed — no claim change (`leave-lifecycle.md` still marks which dispatcher is live as unverified) |
| `USp_GetEmployeeFullInfoReports` | STOREPROCEDURE | modified | reviewed — no claim change |
| 227 HRMS procedures modified | STOREPROCEDURE | bugfixes / tenant work across leave, attendance, workflow, My Details, reports | collapsed; wiki-mapped subset reviewed above |
| `VW_EmployeeReports_Rpt`, `vw_DirectCandidateofferLetter`, `vw_EmployeeSeperationReports`, `vw_ExitInterviewReports` | VIEW | modified | unmapped |
| 150465, `161470-AddIndex-tAttendance` | INDEX | added | unmapped |
| Stage-handoff / claim-training / `TPostAssessmentDetails` synonyms (3) | SYNONYM | added | unmapped |
| `HRMS - Customer License Insight Notifications Job` | SQL_JOB | added | unmapped (pairs with license-insight tables) |
| `DML_Rename_Education_Institute_DisplayText` | DML | seeds `TEmployeeDetail_Fields*` DisplayText Type/Name of Institute | reviewed — no wiki claim change; feature regen My Details |
| `TLicenseInsightSetting` DML + menu DML | DML | seeds insight rules and menu | unmapped |
| Asset ownership / status seed (7 DML) | DML | ownership-type master and status parent-child cleanup | feature regen Asset Management |
| `162408_TLeaveTypeMaster_*_Nullable` (3) | DML | `HO_`/`WO_PrioritizeWorkAttendance`, `IsLeaveExtendedForInterveningDays` nullable | reviewed — no claim change (columns not in `data-schema.md` / leave notable list) |
| other HRMS DML (52) | DML | menus, TFields, geo tagging, leave balance, biometric keys, COB, notifications | count-only |

### HRMS_TRAVELNEXPENSE

| Object | Type | Change | Knowledge |
|---|---|---|---|
| `DDL_TTRAVEL_RESCHEDULE_VERSION_HISTORY` | DDL | create `TTRAVEL_RESCHEDULE_VERSION_HISTORY` | unmapped — no `TABLES/` file |
| `DDL_TTRAVEL_SCHEDULE_Reschedule`, `DDL_TTRAVEL_ACCOMMODATION_Reschedule` | DDL | reschedule columns on schedule/accommodation | unmapped |
| `DDL_TNE_Config_TravelSchedule` | DDL | travel-schedule config | unmapped |
| `DDL_TPaymentSetup_History_rename` | DDL | history-table rename | unmapped |
| `DDL_tAdvances_AdvanceRequestStatus` | DDL | rename `ReassignComment` → `CancelledReassignComment` | reviewed — no claim change (`travelnexpense.md` does not name that column) |
| `FN_TNE_ResolveTravelNotificationScope` | FUNCTION | added | unmapped |
| `SP_TNE_*TravelReschedule*` (7) | STOREPROCEDURE | added — save/get/approve/validate reschedule + version history | unmapped |
| `SP_Advances_ApproveAdvanceRequestById`, `SP_Advances_ApproveMultipleAdvanceRequest` | STOREPROCEDURE | added | unmapped |
| 36 T&E procedures modified | STOREPROCEDURE | advances, notifications, schedule/accommodation approval | collapsed — none cited in llm-wiki domain / data-schema / service-apis |
| `DML_TLookup_Reschedule` | DML | lookup seed for reschedule | unmapped |
| other T&E DML (4) | DML | global access, module pages, travel email TFields | count-only |

### HRM-TIMEPORT

| Object | Type | Change | Knowledge |
|---|---|---|---|
| `USP_Productivity_Utilization_Chart_GlobalFilter` | STOREPROCEDURE | modified | unmapped |

### HRMS-SURVEY

| Object | Type | Change | Knowledge |
|---|---|---|---|
| 8 `Sp_SV_*` procedures | STOREPROCEDURE | modified (list/details/participation/published flag) | unmapped |

### Knowledge pages patched

- `content/llm-wiki/reference/tables/hrms.md` — added `TLicenseInsight`, `TLicenseInsightNotification`, `TLicenseInsightSetting`, `tLeaveTypeRules_Abbrevation`; catalog count 1106 → 1110
- `content/llm-wiki/architecture/module-catalog.md` — HRMS table/SP/function counts; T&E SP/function counts; License insights subsystem
- `content/llm-wiki/domain/attendance-lifecycle.md` — `SP_InsertAttendanceDataWithMachineID` as machine-id sibling of `SP_InsertAttendanceData`

DB repo has no `llm-wiki/` working tree; patches are on the Backstage copy only.

### Needs a knowledge pass

- Unmapped: `TBiometricDevice` (index uniqueness; absent from table catalog)
- Unmapped: Celebrations (`TCelebration*` DDL + 48 `SP_Celebration_*`)
- Unmapped: TCOB process/template section suite
- Unmapped: document storage / storage-provider tables
- Unmapped: `TDashboardSavedView`
- Unmapped: biometric push-API-key / alert procs
- Unmapped: travel reschedule (`TTRAVEL_RESCHEDULE_VERSION_HISTORY` + `SP_TNE_*Reschedule*`)
- Unmapped: stage-handoff view procs
- Unmapped: `UDT_AllowedGroupList`, license-insight SQL Agent job
- Feature regen: `/document-feature Attendance` — guide still claims `SP_InsertAttendanceDataWithMachineID` has no matching file
- Feature regen: `/document-feature My Details` — education DisplayText remap (`FN_Mydetails_GetFieldDisplayText` / CR + education-history SPs)
- Feature regen: `/document-feature Leave Management` — new leave attachment/history procs; `SP_AdminLM_DeleteLeaveTypeRules`
- Feature regen: `/document-feature Asset Management` — status history, dashboard preference, ownership-type seed
- Feature regen: `/document-feature Separation Tasks` — deactivation checklist / `SP_SEP_DeActivateEmployee_BY_ID` (confirm live write is still `SP_SEP_DeActivateEmployee`)
