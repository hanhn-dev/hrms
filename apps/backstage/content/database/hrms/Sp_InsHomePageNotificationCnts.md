---
object: Sp_InsHomePageNotificationCnts
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_InsHomePageNotificationCnts.sql
last-analyzed: 2026-11-06
---

# Sp_InsHomePageNotificationCnts

## What it does

Adds or increments the home-page notification counter for each employee in a comma-separated list, and writes a detail row for the request. The notification id passed in is replaced by a fresh lookup on the normalised request type.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LoggedInEmpId` | in | Comma-separated employee ids whose counters change. |
| `@EmployerId` | in | Organisation stored on a new counter row. |
| `@PendingActionCnt` | in | Added to the manager pending-action count. Cancel passes `-1` for approvers. |
| `@PenindgApprovalCnt` | in | Added to the by-me pending-approval count. The parameter name is spelled this way in the script. Cancel passes `-1` for the canceller. |
| `@NotificationId` | in | Ignored after the procedure looks up `NotificationId` again from `@RequestType`. |
| `@RequestType` | in | Request type. Travel variants collapse to `TravelRequest`. Expense variants collapse to `ExpenseRequest`. |
| `@ForRequestId` | in | Request id stored on the detail row. |
| `@ProcName` | in | Caller name stored on the detail row. Cancel passes `SP_CancelAdminChangesRequest`. |
| `@Comments` | in | Optional comment on the detail row. Default null. |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_InsHomePageNotificationCnts
  participant Split as Split
  Caller->>Main: employee list and deltas
  Main->>Split: split employee ids
```

## Callers

Procedures and functions whose live statements invoke this object. Views are omitted.

| Object | Kind | Page |
|---|---|---|
| `SP_AddAdminChanges` | procedure | [SP_AddAdminChanges](/docs/database/hrms/SP_AddAdminChanges) |
| `SP_AddAdminChanges_DP` | procedure | No page yet |
| `SP_AddCompOffRequest` | procedure | No page yet |
| `SP_AddCompOffRequest_Mobile` | procedure | No page yet |
| `SP_AddEmployeeActivityDetails` | procedure | No page yet |
| `SP_AddResignationDetails` | procedure | No page yet |
| `SP_AdminCMS_UpdReassignManager` | procedure | No page yet |
| `SP_AdminLM_UpdNewLeaveType` | procedure | No page yet |
| `SP_AdminMstr_UpdEmploymentType` | procedure | No page yet |
| `SP_ADMINPMS_EmployeeGoalApproveWF` | procedure | No page yet |
| `SP_AdminPMS_ForceClosedAppStatus` | procedure | No page yet |
| `SP_AdminPMS_InsEmpGoalSettingMapping` | procedure | No page yet |
| `SP_AdminPMS_OnDemandGoalInitiate` | procedure | No page yet |
| `SP_AdminPMS_UpdEmployeeGoalFormDataSubmit` | procedure | No page yet |
| `SP_AdminPMS_UpdGoalInitiate` | procedure | No page yet |
| `SP_AdminPMS_UpdInitiateAppraisalCycle` | procedure | No page yet |
| `SP_AdminPMS_UpdReassignGoalManager` | procedure | No page yet |
| `SP_AdminPMS_UpdReassignManager` | procedure | No page yet |
| `SP_AdminRM_InsDocTemplatesNew` | procedure | No page yet |
| `SP_AdminSCCT_CancelChangesRequest` | procedure | [SP_AdminSCCT_CancelChangesRequest](/docs/database/hrms/SP_AdminSCCT_CancelChangesRequest) |
| `SP_AdminWM_UpdateRoles` | procedure | No page yet |
| `SP_ApproveAdminChangesRequest` | procedure | No page yet |
| `SP_ApproveWorkFlowRequest` | procedure | No page yet |
| `SP_CancelAdminChangesRequest` | procedure | No page yet |
| `SP_CM_ApproveAdminChangesRequest` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequest` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequest_240624` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequest_test` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequestBKP03052025` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequestbkp21032024` | procedure | No page yet |
| `SP_CM_RejectAdminChangesRequest` | procedure | No page yet |
| `SP_CM_RejectWorkFlowRequest` | procedure | No page yet |
| `SP_CM_RejectWorkFlowRequest_240624` | procedure | No page yet |
| `SP_CM_RejectWorkFlowRequestBKP03052025` | procedure | No page yet |
| `SP_CM_RequestReRoute` | procedure | No page yet |
| `SP_CM_RequestReRouteBKP03052025` | procedure | No page yet |
| `SP_CMS_UpdEmpConfirmationRatings` | procedure | No page yet |
| `SP_deleteEmpDocGeneratedDetailsNew` | procedure | No page yet |
| `Sp_DeleteRrsDetails` | procedure | No page yet |
| `SP_DeleteRRSDocTemplateByDocIdNew` | procedure | No page yet |
| `SP_ESS_InsertBusinessCardDetails` | procedure | No page yet |
| `SP_ForceClosedAppraisalStatus` | procedure | No page yet |
| `SP_InsertBusinessCardDetails` | procedure | No page yet |
| `SP_InsertEmpDocGeneratedDetailsNew` | procedure | No page yet |
| `SP_InsertHelpdeskRequest` | procedure | No page yet |
| `SP_InsertLeaveRequestDetails` | procedure | No page yet |
| `Sp_InsertRRSCandidateFeedback` | procedure | No page yet |
| `SP_InsertRrsCandidateInterview` | procedure | No page yet |
| `Sp_InsertRrsDetails` | procedure | No page yet |
| `SP_LA_InsertLeaveRequestDetails` | procedure | No page yet |
| `SP_LA_InsertLeaveRequestDetails_dp` | procedure | No page yet |
| `SP_LA_LeaveCancellation` | procedure | No page yet |
| `SP_LA_OptionalHolidayCancellation` | procedure | No page yet |
| `SP_PMS_InsEmpGoalMappingForNewJoinees` | procedure | No page yet |
| `SP_PMS_UpdBulkEmpAppraisalRatings` | procedure | No page yet |
| `SP_PMS_UpdEmpAppraisalRatings` | procedure | No page yet |
| `SP_PMS_UpdEmployeeGoalFormDataSubmit_WithoutTag` | procedure | No page yet |
| `SP_PMS_UpdReviewerOverallComments` | procedure | No page yet |
| `SP_PMS_UpdSalaryRevForEmployeeAssessment` | procedure | No page yet |
| `SP_PullbackCompOffRequestByEmployee` | procedure | No page yet |
| `SP_PullbackRequest` | procedure | No page yet |
| `SP_RejectAdminChangesRequest` | procedure | No page yet |
| `SP_RejectWorkFlowRequest` | procedure | No page yet |
| `SP_RejectWorkFlowRequestBKP03052025` | procedure | No page yet |
| `SP_RemoveSelectedActivityDetail` | procedure | No page yet |
| `Sp_RescheduleCandidateInterview` | procedure | No page yet |
| `SP_ResignationPullback` | procedure | No page yet |
| `Sp_RRS_CloseRRS` | procedure | No page yet |
| `Sp_RRS_DeleteDetails` | procedure | No page yet |
| `Sp_RRS_InsertCandidateFeedback` | procedure | No page yet |
| `Sp_RRS_InsertCandidateFeedback_051523` | procedure | No page yet |
| `SP_RRS_InsertCandidateInterview` | procedure | No page yet |
| `Sp_RRS_InsertDetails` | procedure | No page yet |
| `SP_RRS_UpdateCandidateInterviewStatus` | procedure | No page yet |
| `Sp_RRS_UpdateDetails` | procedure | No page yet |
| `Sp_RRS_UpdateInitiateHiring` | procedure | No page yet |
| `SP_SEP_AddEmployeeActivityDetails` | procedure | No page yet |
| `SP_SEP_AddResignationDetails` | procedure | No page yet |
| `SP_SEP_ClearanceRequestReRoute` | procedure | No page yet |
| `SP_SEP_RemoveSelectedActivityDetail` | procedure | No page yet |
| `SP_SEP_ResignationPullback` | procedure | No page yet |
| `SP_UpdateCMSEmployeeConfirmationRatings` | procedure | No page yet |
| `SP_UpdatecMSReassignManager` | procedure | No page yet |
| `SP_UpdateEmployeeActivityDetails` | procedure | No page yet |
| `SP_UpdateEmploymentType` | procedure | No page yet |
| `SP_UpdateHelpdeskRequest` | procedure | No page yet |
| `SP_UpdateNewLeaveTypeMaster` | procedure | No page yet |
| `SP_UpdatePMSEmployeeAppraisalRatings` | procedure | No page yet |
| `SP_UpdatePMSReassignManager` | procedure | No page yet |
| `SP_UpdateRoles` | procedure | No page yet |
| `Sp_UpdateRrsDetails` | procedure | No page yet |
| `Sp_UpdateRrsInitiateHiring` | procedure | No page yet |
| `USP_Admin_DeleteDocTemplateByDocId` | procedure | No page yet |
| `USP_Admin_InsDocTemplates` | procedure | No page yet |
| `USP_CompOff_PullbackRequestByEmployee` | procedure | No page yet |
| `USP_CompOff_SaveRequest` | procedure | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Split` | function | split `@LoggedInEmpId` | [Split](/docs/database/hrms/Split) |

The script calls `dbo.split`.

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_InsHomePageNotificationCnts.sql`.

1. Collapse international and plain travel request types to `TravelRequest`, and the three expense request types to `ExpenseRequest`.
2. Replace `@NotificationId` with `THomepageNotifications.NotificationId` for that request type.
3. Split `@LoggedInEmpId` and open a cursor.
4. When the employee has no `THomePageNotificationCnts` row for that notification, insert the counter using `NotificationName` and `Description`, then insert `THomePageCntsDetails` with `CreatedDate = getdate()`.
5. When a row exists, add `@PendingActionCnt` and `@PenindgApprovalCnt` and insert a detail row whose `CreatedDate` is the date only.
6. Close the cursor. A null or empty employee id from the split still enters the loop.

## Tables

| Table | Read or write |
|---|---|
| `THomepageNotifications` | read |
| `THomePageNotificationCnts` | read and write |
| `THomePageCntsDetails` | write |

## Flow

```mermaid
flowchart TD
  Start[Sp_InsHomePageNotificationCnts] --> Norm[Normalise request type]
  Norm --> Id[Lookup NotificationId]
  Id --> Each[Each employee id]
  Each --> Exists{Counter row exists}
  Exists -->|no| Ins[Insert counter and detail]
  Exists -->|yes| Upd[Add the deltas and insert detail]
```
