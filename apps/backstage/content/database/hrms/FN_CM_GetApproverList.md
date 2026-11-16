---
object: FN_CM_GetApproverList
kind: function
database: hrms
source: HRMS-DATABASE/HRMS/FUNCTIONS/FN_CM_GetApproverList.sql
last-analyzed: 2026-11-06
---

# FN_CM_GetApproverList

## What it does

Helper called by a Home dashboard procedure. It reads TWorkflowDetails and returns that result to its caller.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@workflowId` | in | Workflow id sent with the sign-off. The banner sends 0 when it has none (`Int`) |
| `@RoutingLevel` | in | Input used by this procedure (`Int`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as FN_CM_GetApproverList
  Caller->>Main: execute
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_AddCompOffRequest` | procedure | No page yet |
| `SP_AddCompOffRequest_Mobile` | procedure | No page yet |
| `SP_AdminLM_UpdNewLeaveType` | procedure | No page yet |
| `SP_AdminMstr_UpdEmploymentType` | procedure | No page yet |
| `SP_AdminRM_InsDocTemplatesNew` | procedure | No page yet |
| `SP_AdminWM_UpdateRoles` | procedure | No page yet |
| `Sp_Advances_InsAdvanceReqByEmployee` | procedure | No page yet |
| `Sp_Advances_UpdAdvanceReqByEmployee` | procedure | No page yet |
| `SP_Bulk_AddNewEmployee` | procedure | No page yet |
| `SP_Bulk_Create_Activate_Employee` | procedure | No page yet |
| `SP_BulkProfile_UpdateEmployeeOfficialInformation` | procedure | No page yet |
| `SP_CM_ApproveAdminChangesRequest` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequest_240624` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequest_test` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequestBKP03052025` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequestbkp21032024` | procedure | No page yet |
| `SP_deleteEmpDocGeneratedDetailsNew` | procedure | No page yet |
| `SP_DeleteRRSDocTemplateByDocIdNew` | procedure | No page yet |
| `SP_EC_UpdateEmployeeOfficialInformation` | procedure | No page yet |
| `SP_EC_UpdateEmployeeOfficialInformation_240624` | procedure | No page yet |
| `SP_ESS_InsertBusinessCardDetails` | procedure | No page yet |
| `SP_InsertDocumentAttestation` | procedure | [SP_InsertDocumentAttestation](/docs/database/hrms/SP_InsertDocumentAttestation) |
| `SP_InsertEmpDocGeneratedDetailsNew` | procedure | No page yet |
| `SP_LA_AddAttendanceRegularisationDetails` | procedure | No page yet |
| `SP_LA_AddWorkFromHomeRequestDetails` | procedure | No page yet |
| `SP_LA_InsertLeaveRequestDetails` | procedure | No page yet |
| `SP_LA_InsertLeaveRequestDetails_dp` | procedure | No page yet |
| `SP_LA_InsertOptionalHoliday` | procedure | No page yet |
| `SP_LA_LeaveCancellation` | procedure | No page yet |
| `SP_LA_OptionalHolidayCancellation` | procedure | No page yet |
| `SP_LA_UpdateARPullBack` | procedure | No page yet |
| `SP_LA_UpdateLeavePullBack` | procedure | No page yet |
| `SP_LA_UpdateOptionalHolidayPullBack` | procedure | No page yet |
| `SP_LA_UpdateWFHPullBack` | procedure | No page yet |
| `SP_Mydetails_Enhanced_UpdateEmployeeOfficialInformation` | procedure | No page yet |
| `SP_OD_UpdateODPullBack` | procedure | No page yet |
| `SP_PullbackCompOffRequestByEmployee` | procedure | No page yet |
| `SP_PullbackRequest` | procedure | No page yet |
| `Sp_RRS_AssignTransactionDetails` | procedure | No page yet |
| `Sp_RRS_DeleteDetails` | procedure | No page yet |
| `Sp_RRS_InsertCandidateFeedback` | procedure | No page yet |
| `Sp_RRS_InsertCandidateFeedback_051523` | procedure | No page yet |
| `SP_RRS_InsertCandidateInterview` | procedure | No page yet |
| `Sp_RRS_InsertDetails` | procedure | No page yet |
| `Sp_RRS_InsertJobPosting` | procedure | No page yet |
| `Sp_RRS_UpdateCandidate` | procedure | No page yet |
| `Sp_RRS_UpdateChildDetails` | procedure | No page yet |
| `Sp_RRS_UpdateDetails` | procedure | No page yet |
| `Sp_RRS_UpdateInitiateHiring` | procedure | No page yet |
| `Sp_RRS_UpdateInitiateHiringByEmail` | procedure | No page yet |
| `SP_RRS_UpdOnHoldCandidateStatus` | procedure | No page yet |
| `SP_SEP_AddEmployeeActivityDetails` | procedure | No page yet |
| `SP_SEP_AddResignationDetails` | procedure | No page yet |
| `SP_SEP_DeActivateEmployeeBKP03052025` | procedure | No page yet |
| `SP_SEP_DeActivateEmployeeWithAssets` | procedure | No page yet |
| `SP_SEP_ResignationPullback` | procedure | No page yet |
| `SP_SEP_UpdateEmployeeActivityDetails` | procedure | No page yet |
| `USP_Admin_DeleteDocTemplateByDocId` | procedure | No page yet |
| `USP_Admin_InsDocTemplates` | procedure | No page yet |
| `USP_AdminLM_UpdNewLeaveType` | procedure | No page yet |
| `USP_ApplyOnDuty` | procedure | No page yet |
| `USP_AttendanceOverTime_Process` | procedure | No page yet |
| `USP_Candidate_ExpectedDOJ_Update` | procedure | No page yet |
| `USP_ClaimEventLeave_SaveRequest` | procedure | No page yet |
| `USP_ClaimOT_ProcessPendingRequests` | procedure | No page yet |
| `USP_CompOff_SaveRequest` | procedure | No page yet |
| `Usp_CRB_InsertConfbooking` | procedure | No page yet |
| `USP_FNF_Employee_Pullback` | procedure | No page yet |
| `USP_FNF_Employee_SaveUpdate` | procedure | No page yet |
| `USP_LA_InsertLeaveRequestDetails` | procedure | No page yet |
| `USP_LA_LeaveType_Update` | procedure | No page yet |
| `USP_OH_PullbackRequest` | procedure | No page yet |
| `USP_OH_SaveRequest` | procedure | No page yet |
| `USP_OT_Claim_Process` | procedure | No page yet |
| `USP_OT_Deviation_Save` | procedure | No page yet |
| `USP_OT_OTRequest_SaveDeviation` | procedure | No page yet |
| `USP_RI_PullBack` | procedure | No page yet |
| `USP_RI_SaveUpdate` | procedure | No page yet |
| `USP_WFH_PullbackRequest` | procedure | No page yet |
| `USP_WFH_SaveRequest` | procedure | No page yet |

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRMS/FUNCTIONS/FN_CM_GetApproverList.sql`:

1. Read `TWorkflowDetails`.
2. Return the result set to the caller.

## Tables

| Table | Read or write |
|---|---|
| `TWorkflowDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[FN_CM_GetApproverList] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
