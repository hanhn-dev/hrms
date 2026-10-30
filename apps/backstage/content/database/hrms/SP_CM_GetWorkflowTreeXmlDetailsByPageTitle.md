---
object: SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle.sql
last-analyzed: 2026-10-30
---

# SP_CM_GetWorkflowTreeXmlDetailsByPageTitle

## What it does

Returns one workflow definition for a module page. With no employee, it delegates to the employer-only lookup. With an employee, it records the employer on the employee, may replace the input employer when they differ, and then picks an enabled workflow mapped to the page that matches the employee's location and business unit.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@PageTitle` | in | Module page name. `WorkFromHome` is rewritten to `AttendanceRegularize-WFH` on the employee path |
| `@Employerid` | in | Employer used to find the workflow. Replaced by the employee's employer when they differ |
| `@Employeeid` | in | Employee whose location and business unit narrow the workflow. Null or 0 takes the employer-only path. Default is null |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
  participant Emp as SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId
  Caller->>Main: execute
  alt employee id is null or 0
    Main->>Emp: page title and employer
  end
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_AdminPMS_InsEmpAppraisalCycleMapping` | procedure | No page yet |
| `SP_AdminPMS_InsEmpGoalSettingMapping` | procedure | No page yet |
| `SP_AdminPMS_UpdInitiateAppraisalCycle` | procedure | No page yet |
| `Sp_ApproveRejectMyDetailsReview` | procedure | [Sp_ApproveRejectMyDetailsReview](/docs/database/hrms/Sp_ApproveRejectMyDetailsReview) |
| `Sp_ApproveRejectOfferRolledOut` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequest` | procedure | No page yet |
| `SP_CM_ApproveWorkFlowRequestBKP03052025` | procedure | No page yet |
| `SP_CMS_GetCompetencyforConfirmation` | procedure | No page yet |
| `SP_CMS_GetWorkflowRoutingLevels_New` | procedure | No page yet |
| `Sp_CMS_InsertEmployeeConfirmation` | procedure | No page yet |
| `SP_EC_UpdateEmployeePersonalInformation` | procedure | No page yet |
| `SP_EMPMD_AddCertificationDet` | procedure | No page yet |
| `SP_EMPMD_AddEducationDetails` | procedure | No page yet |
| `SP_EMPMD_AddEmpAttachment` | procedure | No page yet |
| `SP_EMPMD_AddEmpBankDet` | procedure | No page yet |
| `SP_EMPMD_AddEmpContactDet` | procedure | No page yet |
| `SP_EMPMD_AddEmpEmergencyContactDet` | procedure | No page yet |
| `SP_EMPMD_AddEmpFamilyDet` | procedure | No page yet |
| `SP_EMPMD_AddEmpNominationInfo` | procedure | No page yet |
| `SP_EMPMD_AddEmpPassportDet` | procedure | No page yet |
| `SP_EMPMD_AddEmpVisaInfo` | procedure | No page yet |
| `SP_EMPMD_AddPastEmploymentDet` | procedure | No page yet |
| `SP_EMPMD_UpdCertificationDet` | procedure | No page yet |
| `SP_EMPMD_UpdEducationDet` | procedure | No page yet |
| `SP_EMPMD_UpdEmpAttachment` | procedure | No page yet |
| `SP_EMPMD_UpdEmpBankDet` | procedure | No page yet |
| `SP_EMPMD_UpdEmpContactDet` | procedure | No page yet |
| `SP_EMPMD_UpdEmpCustomFields` | procedure | No page yet |
| `SP_EMPMD_UpdEmpEmergencyContactDet` | procedure | No page yet |
| `SP_EMPMD_UpdEmpFamilyDet` | procedure | No page yet |
| `SP_EMPMD_UpdEmpNominationDet` | procedure | No page yet |
| `SP_EMPMD_UpdEmpVisaInfo` | procedure | No page yet |
| `SP_EMPMD_UpdPastEmploymentDet` | procedure | No page yet |
| `SP_InsertUpdatePOBCandidateInfo` | procedure | No page yet |
| `SP_InsertUpdateTBudget` | procedure | No page yet |
| `SP_InsUpdatePOBCandidateLogin` | procedure | No page yet |
| `SP_LA_UpdateARPullBack` | procedure | No page yet |
| `SP_LA_UpdateLeavePullBack` | procedure | No page yet |
| `SP_LA_UpdateOptionalHolidayPullBack` | procedure | No page yet |
| `SP_LA_UpdateWFHPullBack` | procedure | No page yet |
| `SP_MyDetails_EMPMD_UpdEmpCustomFields` | procedure | No page yet |
| `SP_OD_UpdateODPullBack` | procedure | No page yet |
| `SP_PMS_InsEmpGoalMappingForNewJoinees` | procedure | No page yet |
| `Sp_RRS_GetStatusCounts` | procedure | No page yet |
| `Sp_RRS_InsertCandidateFeedback` | procedure | No page yet |
| `Sp_RRS_InsertDetails` | procedure | No page yet |
| `Sp_RRS_UpdateChildDetails` | procedure | No page yet |
| `Sp_RRS_UpdateDetails` | procedure | No page yet |
| `SP_RRS_UpdateHiringApprovalOnHold` | procedure | No page yet |
| `Sp_RRS_UpdateInitiateHiring` | procedure | No page yet |
| `Sp_RRS_UpdCandidateShortListStatus` | procedure | No page yet |
| `SP_RRS_UpdOnHoldCandidateStatus` | procedure | No page yet |
| `SP_RRS_UpdShortlistCandidateStatus` | procedure | No page yet |
| `Sp_SendCandidateForReview` | procedure | No page yet |
| `SP_SEP_AddEmployeeActivityDetails` | procedure | No page yet |
| `SP_SEP_AutoDeactivateEmployee` | procedure | No page yet |
| `SP_SEP_GET_ResignationCommentsBasedOnConfig` | procedure | No page yet |
| `SP_SEP_GETResignation_Approver_Details` | procedure | No page yet |
| `SP_SEP_LockUnlockUserAccountByLWD` | procedure | No page yet |
| `SP_SEP_Update_LastWorkingDatePast` | procedure | No page yet |
| `SP_SEP_UpdateEmployeeActivityDetails` | procedure | No page yet |
| `SP_TaskAtRiskReminderNotification` | procedure | No page yet |
| `SP_TaskOverdueReminderNotification` | procedure | No page yet |
| `SP_UpdatePOBCandidateStatus` | procedure | No page yet |
| `SP_UpdatePreOfferCandidateStatus` | procedure | No page yet |
| `USP_AttendanceOverTime_Process` | procedure | No page yet |
| `USP_ClaimEventLeave_Pullback` | procedure | No page yet |
| `USP_ClaimLocum_PullBack` | procedure | No page yet |
| `USP_ClaimLocum_SaveUpdate` | procedure | No page yet |
| `USP_ClaimOT_ProcessPendingRequests` | procedure | No page yet |
| `USP_ClaimOT_SaveUpdate` | procedure | No page yet |
| `USP_ClaimOT_SendThresholdAlert` | procedure | No page yet |
| `USP_ClaimPH_PullBack` | procedure | No page yet |
| `USP_ClaimPH_SaveUpdate` | procedure | No page yet |
| `USP_CM_ValidateWorkflowConfigured` | procedure | No page yet |
| `USP_CompOff_SaveRequest` | procedure | No page yet |
| `USP_Employee_MyDetails_BudgetSource_Update` | procedure | No page yet |
| `USP_Employer_Master_Data_Select` | procedure | No page yet |
| `USP_EmployerMaster_GetData` | procedure | No page yet |
| `USP_FNF_Employee_Pullback` | procedure | No page yet |
| `USP_FNF_Employee_SaveUpdate` | procedure | No page yet |
| `USP_InsUpdatePOCandidateInitiateLogin` | procedure | No page yet |
| `USP_LA_LeaveType_Save` | procedure | No page yet |
| `USP_LA_LeaveType_Update` | procedure | No page yet |
| `USP_LE_Encashment_Save` | procedure | No page yet |
| `Usp_Mydetails_Enhanced_ProcessEmployeesCertificationInformation` | procedure | No page yet |
| `Usp_Mydetails_Enhanced_ProcessEmployeesFamilyInformation` | procedure | [Usp_Mydetails_Enhanced_ProcessEmployeesFamilyInformation](/docs/database/hrms/Usp_Mydetails_Enhanced_ProcessEmployeesFamilyInformation) |
| `Usp_Mydetails_Enhanced_ProcessEmployeesPastEmploymentInformation` | procedure | No page yet |
| `Usp_Mydetails_Enhanced_UpdateEmployeeVisaInformation` | procedure | No page yet |
| `Usp_Mydetails_Enhanced_UpdateProfilePicture` | procedure | No page yet |
| `USP_OfferAcceptance_SaveUpdate` | procedure | No page yet |
| `USP_OH_PullbackRequest` | procedure | No page yet |
| `USP_OT_Claim_Manual` | procedure | No page yet |
| `USP_OT_Claim_Process` | procedure | No page yet |
| `USP_OT_Claim_ThresholdAlert_Raise` | procedure | No page yet |
| `USP_OT_Deviation_Save` | procedure | No page yet |
| `USP_OT_OTRequest_SaveDeviation` | procedure | No page yet |
| `USP_OT_OTRequest_SaveUpdate` | procedure | No page yet |
| `USP_OT_Planned_SaveUpdate` | procedure | No page yet |
| `USP_Process_TARRequestImport` | procedure | No page yet |
| `USP_Process_TLeaveRequestImport` | procedure | No page yet |
| `USP_SaveOnDutyConfig` | procedure | No page yet |
| `USP_UpdatePOBCandidateExpectedDOJ` | procedure | No page yet |
| `USP_UpdatePOBPreOfferRecruierStatus` | procedure | No page yet |
| `usp_vw_UserAccountEnableDisable` | procedure | No page yet |
| `USP_WFH_PullbackRequest` | procedure | No page yet |
| `USP_WFH_SaveRequest` | procedure | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId` | procedure | `@Employeeid` is null or 0 | [SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId](/docs/database/hrms/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle.sql`:

1. Set `NOCOUNT ON` and `READ UNCOMMITTED`.
2. When `@Employeeid` is null or 0, execute [SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId](/docs/database/hrms/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId) with `@PageTitle` and `@Employerid`, and return that result.
3. Otherwise read `Employerid` from `TEmployee` for `@Employeeid`. The `LEAVEREQUEST` / `ATTENDANCEREGULARIZE` branch and the other branch run the same select.
4. Insert a row into `TMismatchWorkflowTrace` with the page title, employee, input employer, and the employer just read. Keep `SCOPE_IDENTITY()` as `@TraceId`.
5. When `@Employerid` differs from the employee's employer, set `@Employerid` to the employee's employer and set `IsWorkflowIncorrect = 1` on that trace row.
6. Read `AllowPartialWorkflow` from `TCustomerSettings` for the employer now in `@Employerid`.
7. Read `BusinessUnitId` and `LocationId` from `TEmployeeInfo` for the employee.
8. When `@PageTitle` is `WorkFromHome`, set it to `AttendanceRegularize-WFH`.
9. Read `ModulePageId` from `TModulePages` for that page name.
10. Load `#WorkFlow` from enabled, non-deleted `TWorkflowManagement` rows for the employer whose `MappedPages` contains that page id. A partial workflow is included only when `AllowPartialWorkflow` is 0. Flag whether the workflow has location rows, business-unit rows, and whether those rows match this employee.
11. When `#WorkFlow` has a non-default row, keep in `#CustomWorkFlows` the rows that match both location and business unit, or only business unit when the workflow has no locations, or only location when the workflow has no business units.
12. When `#CustomWorkFlows` has a row, return its `WorkflowId`, `WorkflowDefinitionTree`, and `SkipWorkFlow`.
13. When it does not, return the non-default workflow that has no location and no business-unit mapping.
14. When `#WorkFlow` has no non-default row, return the default workflow from `#WorkFlow`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TMismatchWorkflowTrace` | write |
| `dbo.TCustomerSettings` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TModulePages` | read |
| `dbo.TWorkflowManagement` | read |
| `dbo.TWorkFlowLocations` | read |
| `dbo.TWorkFlowBusinessUnits` | read |
| `#WorkFlow` | write |
| `#CustomWorkFlows` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_CM_GetWorkflowTreeXmlDetailsByPageTitle] --> HasEmp{Employee id is null or 0}
  HasEmp -->|yes| EmpOnly[SP_CM_GetWorkflowTreeXmlDetailsByPageTitle_EmpId]
  HasEmp -->|no| Trace[Write TMismatchWorkflowTrace]
  Trace --> Match[Load workflows for the page]
  Match --> Custom{Employee location or business unit matches}
  Custom -->|yes| ReturnCustom[Return the matching workflow]
  Custom -->|no| ReturnFallback[Return unscoped non-default or the default]
```
