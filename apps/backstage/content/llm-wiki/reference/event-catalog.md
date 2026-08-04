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

| RequestType | Domain | Pairs with cancellation / pullback |
|---|---|---|
| `LeaveRequest` | Leave | `LeaveCancellation`, `LeavePullback` |
| `LeaveCancellation` | Leave | — |
| `LeavePullback` | Leave | — |
| `OptionalHolidayRequest` | Leave | `OptionalHolidayCancellation` |
| `OptionalHolidayCancellation` | Leave | — |
| `CompOffCreditRequest` | Leave (comp-off) | — |
| `WorkFromHome` | Attendance | `WFHCancellation`, `WorkFromHomePullback` |
| `WFHCancellation` | Attendance | — |
| `WorkFromHomePullback` | Attendance | — |
| `AttendanceRegularize` | Attendance | `ARCancellation` |
| `ARCancellation` | Attendance | — |
| `ResignationDetails` | Separation | `ResignationPullback` |
| `ResignationActivity` | Separation | — |
| `ResignationPullback` | Separation | — |
| `TerminationActivity` | Separation | — |
| `BusinessCard` | Employee services | — |
| `SelfAssessment` | Confirmation (CMS) | — |
| `ConfirmationAssessment` | Confirmation (CMS) | — |
| `RecruitmentManagement` | Recruitment (RRS) | — |
| `InterviewFeedback` | Recruitment (RRS) | — |
| `InitiateHiring` | Recruitment (RRS) | — |

(21 distinct values, confirmed with none missing / none new as of 2026-07-15;
`SP_ApproveWorkFlowRequest.sql:91-170`, `:585-1206`.)

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
