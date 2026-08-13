---
sources:
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
  - HRMS-DATABASE/HRMS/TABLES/TRequestWorkflows.sql
  - HRMS-DATABASE/HRMS/TABLES/TEMAIL_NOTIFICATION (synonyms)
confidence: medium
last-analyzed: 2026-07-15
---

# Event Catalog

This system has no message bus. Its closest analog to "events" is the set of
**approval `RequestType`s** that flow through the workflow engine, plus the
**email-notification** records emitted as side effects. This page enumerates them.

## Approvable request types (`TRequestWorkflows.RequestType`)

Each value is the discriminator on a routing row and the `@RequestType` branch in
`SP_ApproveWorkFlowRequest`. The list below is **complete for that one
procedure** — verified 2026-07-15 against two parallel `IF/ELSE-IF` chains, an
owner-resolution chain (`:91-170`) and the side-effect chain (`:585-1206`),
both carrying the same 21 values; other procedures may introduce more, so
treat it as the approval engine's known set, not a closed universe.

`TRequestWorkflows.RequestTransid` is polymorphic — it holds the PK of a
different "artifact" table depending on `RequestType`. Target table/column
verified 2026-08-10 against the side-effect chain and each target table's own
`CREATE TABLE` script (see `../domain/approval-workflow.md` for the ER diagram):

| RequestType | Domain | Pairs with cancellation / pullback | Target table (via `RequestTransid`) | Target PK declared? |
| --- | --- | --- | --- | --- |
| `LeaveRequest` | Leave | `LeaveCancellation`, `LeavePullback` | `TLeaveRequest.TransId` | Yes |
| `LeaveCancellation` | Leave | — | `TLeaveRequest.TransId` | Yes |
| `LeavePullback` | Leave | — | `TLeaveRequest.TransId` | Yes |
| `OptionalHolidayRequest` | Leave | `OptionalHolidayCancellation` | `TOptionalHolidayRequest.TransId` | Yes |
| `OptionalHolidayCancellation` | Leave | — | `TOptionalHolidayRequest.TransId` | Yes |
| `CompOffCreditRequest` | Leave (comp-off) | — | `TCompOffRequest.TransId` | Yes |
| `WorkFromHome` | Attendance | `WFHCancellation`, `WorkFromHomePullback` | `TWorkFromHomeRequest.TransID` | **No** (IDENTITY only) |
| `WFHCancellation` | Attendance | — | `TWorkFromHomeRequest.TransID` | **No** |
| `WorkFromHomePullback` | Attendance | — | `TWorkFromHomeRequest.TransID` | **No** |
| `AttendanceRegularize` | Attendance | `ARCancellation` | `TAttendanceRegularization.TransID` | Yes |
| `ARCancellation` | Attendance | — | `TAttendanceRegularization.TransID` | Yes |
| `ResignationDetails` | Separation | `ResignationPullback` | `TResignationDetails.ResignationDetailId` | Yes |
| `ResignationActivity` | Separation | — | `TActivityDetails.ActivityDetailId` | Yes |
| `ResignationPullback` | Separation | — | `TResignationDetails.ResignationDetailId` | Yes |
| `TerminationActivity` | Separation | — | `TTerminationActivityDetails.ActivityDetailId` | **No** (IDENTITY only) |
| `BusinessCard` | Employee services | — | `TBusinessCards.BusinessCardId` | Yes |
| `SelfAssessment` | Confirmation (CMS) | — | `TPMSEmployeeSelfAppraisal.TransId` | **No** (IDENTITY only) |
| `ConfirmationAssessment` | Confirmation (CMS) | — | `TCMSEmployeeConfirmation.Confirmationid` | **No** (IDENTITY only) |
| `RecruitmentManagement` | Recruitment (RRS) | — | `TRRSDetails.RRSId` | Yes |
| `InterviewFeedback` | Recruitment (RRS) | — | `TRRSCandidateInterview.Interviewid` | Yes |
| `InitiateHiring` | Recruitment (RRS) | — | `TRRSCandidate.Candidateid` | Yes |

(21 distinct values, confirmed with none missing / none new as of 2026-07-15;
`SP_ApproveWorkFlowRequest.sql:91-170`, `:585-1206`.) A 15th target-table
family exists outside this procedure: admin config-change approvals
(`SP_AddAdminChanges.sql:333-334`) also insert into `TRequestWorkflows` with
`RequestTransid = TAdminChangesApprovals.ChangeRequestID`, approved by a
separate procedure (`SP_ApproveAdminChangesRequest.sql`, not read in depth).

> ⚠️ Four target tables have **no declared PRIMARY KEY** on the column
> `RequestTransid` points to — `TWorkFromHomeRequest`, `TTerminationActivityDetails`,
> `TPMSEmployeeSelfAppraisal`, `TCMSEmployeeConfirmation` rely on an
> unconstrained `IDENTITY` column only. Combined with `TRequestWorkflows`
> itself having no declared PK either, this whole polymorphic link is entirely
> application-enforced, not schema-enforced.

## Routing-row state transitions

`TRequestWorkflows.ApproveStatus`: `'P'` (pending) → approved row sets
`IsApprove = 1`. Reassignment of an approver records `OldManagerId`,
`ReassignReason`, `ReassignDate`. (`TRequestWorkflows.sql:8-18`.)

## Notification "events"

Side-effect notifications are written to `TEMAIL_NOTIFICATION` (per module,
surfaced cross-database via synonyms such as `TEMAIL_NOTIFICATION_TRAINING`,
`TEMAIL_NOTIFICATION_SURVEY`, `TEMAIL_NOTIFICATION_TRAVELNEXPENSE`) and to
home-page notifications keyed via
`Fn_GetHomePageNotificationIdByRequestType(@RequestType)`
(`SP_ApproveWorkFlowRequest.sql:80`). The notification payload schema per module
was not extracted in depth — see `../assumptions/open-questions.md`.

## Admin-change "events"

Configuration changes pending approval are recorded as XML payloads in
`TAdminChangesApprovals` / `TAdminChangesApprovalDetails` by `SP_AddAdminChanges`
(see `extension-points.md` §3).
