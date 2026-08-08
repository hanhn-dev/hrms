# Workflow `PageTitle` / `ModulePageName` reference

Reference for `setup-test-workflow.sql`'s `@ModulePageName` parameter. This is
the literal string a request-creation stored procedure passes to
`SP_CM_GetWorkflowTreeXmlDetailsByPageTitle` to resolve which
`TWorkflowManagement` row governs that request type — it must match a real
`TModulePages.ModulePageName` value exactly.

Built by tracing every call site of `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle`
/ `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId` / `USP_CM_GetWorkflowTreeDetailsByPageTitle`
across `HRMS-DATABASE/HRMS/STOREPROCEDURE`, cross-checked against the ~50
`*TModulePages*.sql` DML/seed scripts under `HRMS-DATABASE/HRMS/DML`. There is
no single master seed file for `TModulePages` or `THrmsModules` — Modules are
enabled per employer at runtime via `TEmployerModule` (see
`SP_AdminWM_GetHRMSModules.sql`, what the Admin UI's "Select Module" dropdown
actually calls), and `TModulePages` rows were added incrementally by dozens of
one-off migration scripts. Neither is reconstructable as a fixed list from
source alone — treat this doc as thorough business-feature *context*, not the
authoritative live list.

**`list-modules-and-pages.sql` (same folder) is the authoritative source** —
it queries your actual target employer for its live modules, workflow-eligible
pages, existing roles, and already-configured workflows (shown in the same
`RoleName[RoleID]` format the Define Workflow screen uses, e.g. `HR[6]`). Run
that first; use this doc only for the "which real feature is this page" context
it can't tell you.

## Which setup applies

`setup-test-workflow.sql` covers the **generic case**: a workflow whose
approver at every level resolves dynamically via `WorkflowRole` = `'R'`
(the requester's `TORGChart.ReportsTo`) or `'F'` (their
`TEmployeeInfo.FunctionalManager`). This covers the large majority of pages
below — same two setup procs, same tables, only `@ModulePageName` changes.

Two domains genuinely need **different** setup and are NOT covered by that
script:

- **Recruitment role-based approvers** (`WorkflowRole` = `'B'` Recruitment
  Admin, `'D'` Recruiter, `'H'` Hiring Manager, `'M'` Business Unit Head) —
  these resolve through `TRoles`/`TRecruiter`/`TEmployeeOrgBusinessHead`, not
  `ReportsTo`/`FunctionalManager`. Ask if you need this set up.
- **`SelfAssessment` / `EmployeeGoalSettingReassign` (Goal Setting) /
  `ConfirmationAssessment`** — these are read directly from the
  `WorkflowDefinitionTree` XML at approval time (confirmed in
  `USP_WorkFlow_Routing_Levels.sql`), not from `TWorkflowDetails` rows. The
  setup script's placeholder tree won't produce a working chain here — build
  these through the Admin > Workflow Management UI instead.

## Core approval-workflow pages (Leave & Attendance module)

| Feature | `@ModulePageName` | Notes |
|---|---|---|
| Leave request | `LEAVEREQUEST` | Most-verified — start here for a smoke test |
| Leave cancellation/pullback | `LeaveRequest` or `LeaveCancellation` | Depends on employer's `IsLeavePullBackWorkFlowEnabled` flag |
| Work From Home | `WorkFromHome` | Gets remapped internally to `AttendanceRegularize-WFH` before the `TModulePages` lookup — pass `WorkFromHome`, not the remapped name |
| WFH cancellation/pullback | `AttendanceRegularize-WFH` or `WFHCancellation` | Flag-conditional, same pattern |
| Attendance Regularization | `AttendanceRegularize` | |
| AR cancellation/pullback | `AttendanceRegularize` or `ARCancellation` | Flag-conditional |
| Optional Holiday | `OPTIONALHOLIDAYREQUEST` | |
| Optional Holiday cancellation | `OptionalHolidayRequest` or `OptionalHolidayCancellation` | Flag-conditional |
| On-Duty | `OnDuty` | |
| On-Duty cancellation | `OnDuty` or `OnDutyCancellation` | Flag-conditional |
| Comp-Off request | `CompOffRequest` (renamed `ClaimCompOff` in later data) | Verify which name is live in your DEV instance |
| Claim Overtime | `ClaimOverTime` (originally seeded `AttendanceOverTime`, later renamed) | `IsWorkflowAvailable = 1` confirmed |
| Pre-Approval OT request | `Pre-ApprovalOTRequest` | `IsWorkflowAvailable = 1` confirmed |
| Claim Locum | `ClaimLocumRequest` / `ClaimLocumCancellation` | `IsWorkflowAvailable = 1` confirmed |
| Claim Public Holiday | `ClaimPHRequest` / `ClaimPHCancellation` | Older code also uses `ClaimPH` for the same feature — same underlying row |
| Leave Encashment | `LeaveEncashment` | `IsWorkflowAvailable = 1` confirmed |
| Generic request reroute/reassign (any domain) | `RequestReroute` | Confirmed module = Leave & Attendance despite being used cross-domain |

## Separation module

| Feature | `@ModulePageName` | Notes |
|---|---|---|
| Resignation request | `ResignationDetails` | |
| Resignation pullback | `ResignationPullback` | |
| Resignation activity log | `ResignationActivity` | |
| Termination | `TerminationActivity` | `IsWorkflowAvailable = 1` confirmed |
| Full & Final Settlement | `EmployeeF&F` | `IsWorkflowAvailable = 1` confirmed |
| Separation-specific request reroute | `SeparationRequestReroute` | |

## Recruitment module (RRS) — needs role-based setup, see above

| Feature | `@ModulePageName` | Notes |
|---|---|---|
| Recruitment/job requisition | `RecruitmentManagement` | |
| Initiate hiring | `InitiateHiring` | |
| Interview feedback | `InterviewFeedback` | |
| Candidate shortlisting | `ShortlistedCandidate` | |
| Recruiter allocation | `RA-InitiateReallocation` / `RA-PullBackInitiateReallocation` | |
| RRS allocation | `RRSALLOCATION` | |
| Budget approval | `BudgetApproval` | |
| Pre-onboarding candidate flows | `CandidateSubmitToRecruiter`, `CandidateRefillToRecruiter`, `PreOnboardingCandidatePendingForReview`, `PreOnboardingCandidateApproved`, `PreOnboardingCandidateClosed`, `PreOnboardingExpectedDOJUpdateInternal`, `CandidateLinkInitiateToRecruiter`, etc. | Mostly notification-only (`IsWorkflowAvailable = 0`), not real approval chains |

## Performance / Confirmation (PMS/CMS) — needs XML-tree setup, see above

| Feature | `@ModulePageName` |
|---|---|
| Self assessment | `SelfAssessment` |
| Goal setting | `GoalSetting` / `EmployeeGoalSettingReassign` |
| Confirmation | `ConfirmationAssessment` |

## MyDetails / employee master-data change requests

| Feature | `@ModulePageName` | Notes |
|---|---|---|
| Any MyDetails field change (contact, bank, family, education, nomination, visa, passport, custom fields, profile picture — ~20 sub-forms) | `EmploymentTypeChange` | Confirmed module = My Details. Every sub-form shares this **same** page title/workflow |
| My Details page / employee letters | `MyDetails`, `EmployeeLetters` | Separate pages on employer 10 |
| End of contract reminder / updation | `EndOfContractReminder`, `EndOfContractUpdation` | Often notification-flagged; still `IsWorkflowAvailable = 1` |

## Admin master-data changes (config edits routed for approval)

| Feature | `@ModulePageName` |
|---|---|
| Leave type creation | `CreateLeaveType` |
| Designation/Title master | `SetDesignations` |
| Calendar master | `CalendarMaster` |
| Bank/branch master | `BankMaster` (typo'd `BankMAster` in a couple of procs — same row, case-insensitive collation) |
| Skill category master | `SkillCategories` |
| BGV category master | `BackgroundVerificationCategory` |
| Role/access rights | `RoleAccessRightManagement` |
| Attendance category | `AttendanceCategory` |
| Employment type master | `EmploymentTypeMaster` |
| Grade / Holiday / Shift / WeeklyOff / Location / OptionalHoliday masters | `GradeMaster`, `HolidayMaster`, `ShiftMaster`, `WeeklyOffMaster`, `LocationMaster`, `OptionalHolidayMaster` |
| Leave credit rules | `LeaveCreditRules` |
| In/Out notification | `InOutNotification` |
| News and events | `NewsAndEvents` |
| Policy documents setup | `Policy Documents Setup` (space in live name — script file is `PolicyDocumentsSetup.sql`) |
| Resignation master | `ResignationMaster` |
| Roles / users permissions | `RolesPermissions`, `UsersPermissions` |
| User access rights | `UserAccessRightManagement` |
| Workflow group | `WorkflowGroup` |

## Travel & Expense module

`TravelRequestAcknowledgementPending`, `TravelTicketingPending`,
`TravelReportSubmissionPending`, `TravelBookingComplete`, `TravelRequestStalled`,
`MoreAccommodationRequest`, `AccommodationItineraryRequest`,
`TravelReportRevision`, `TravelReportCompletion`, `ExpenseRequestReassign`,
`ExpenseRequest`, `TravelApprovalReminder`, `TravelReport`,
`TravelRequestReassign`, `TravelRescheduleRequest` —
all `IsWorkflowAvailable = 1` confirmed for employer 10.

## Other modules with per-page setup scripts (employer 10 live list)

| Module folder | `@ModulePageName` examples |
|---|---|
| `advances/` | `AdvanceRequest` |
| `asset-management/` | `UpcomingAssetAllocationEndDate`, `UpcomingAssetWarrentyEndDate` |
| `employee-management/` | `DeactivationEmployeeDialog`, `ReactivationEmployeeDialog`, `EmployeeDetails`, `EmployeeSummaryPermissions` |
| `employee-self-service/` | `AdminHelpDeskSubmitted`/`Updated`, `ISHelpDesk*`, `FinanceHelpDesk*`, `BusinessCard`, `DocumentBuilderESS` |
| `lms/` | `TR-ExternalTrainingEmpSelfAdd` |
| `my-details/` | `EmploymentTypeChange`, `EmployeeLetters`, `MyDetails`, `EndOfContractReminder`, `EndOfContractUpdation` |
| `performance-confirmation/` | `SelfAssessment`, `GoalSetting`, `ConfirmationAssessment`, `SalaryRecommendations`, `ViewAssessments` |
| `policy-documents/` | `PolicyDocumentActivation`, `PolicyDocumentSignOffConfirmation`, `SelfAttestation` |
| `recruitment/` | plus `IJP Approval` (file `IJPApproval.sql`), `OfferPendingForReview`, `OfferRevoke`, `DocumentBuilderRecruitment` |
| `resource-allocation/` | `RA-FreezeUnFreeze` (also `RA-InitiateReallocation` / `RA-PullBackInitiateReallocation` under `recruitment/`) |
| `reward-and-recognition/` | `EmployeeRecognition`, `JuryAward`, `RecognitionAward`, `RewardFinanceChange`, `SpotlightAward`, `WallOfFameAward` |
| `leave-and-attendance/` | plus `AttendanceRegularize-WFH`, `CompOffRequest`, `CompOffCreditRequest`, `AttendanceNotification`, `Pre-ApprovalOTRequestReminder`; live mixed-case `LeaveRequest` / `OptionalHolidayRequest` use `*-Live.sql` filenames (Windows FS is case-insensitive vs `LEAVEREQUEST` / `OPTIONALHOLIDAYREQUEST`) |

## Known inconsistencies to watch for

- `BankMaster` vs `BankMAster` (typo in some procs)
- `ClaimPHRequest` vs `ClaimPH` (older naming)
- `LEAVEREQUEST`/`ATTENDANCEREGULARIZE` (uppercase, older core pages) vs mixed-case names used elsewhere for related cancellation/pullback variants
- On Windows, `LeaveRequest.sql` and `LEAVEREQUEST.sql` collide — use `LeaveRequest-Live.sql` / `OptionalHolidayRequest-Live.sql` for the mixed-case live page names
- A few page titles are caller-supplied parameters forwarded verbatim from application code (not hardcoded in any stored proc found) — their exact literal couldn't be verified from source and are omitted here.
- Notification-only pages (`IsNotificationOnlyWorkFlow = 1`) are intentionally not given setup scripts by default; run `list-modules-and-pages.sql` if you need one.
