---
object: USP_LA_LeaveType_Update
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_Update.sql
last-analyzed: 2026-11-09
---

# USP_LA_LeaveType_Update

## What it does

Updates a leave type for Leave Policy (React). May file an admin-change approval, refresh history, and update policy JSON via nested procedures.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveTransactionId` | in | `INT` |
| `@LeaveCode` | in | `VARCHAR(4)` |
| `@StartPeriod` | in | `DATE` |
| `@Gender` | in | `CHAR(1)` |
| `@PullbackApplicable` | in | `BIT` |
| `@InterveningHolidays` | in | `BIT` |
| `@InterveningWeeklyOff` | in | `BIT` |
| `@MaxDaysToApply` | in | null |
| `@MinDaysToApply` | in | null |
| `@WaitingPeriod` | in | `INT` |
| `@AllowDaysPerMonth` | in | null |
| `@IsActive` | in | `BIT` |
| `@PrefixWeeklyOff` | in | `BIT` |
| `@SuffixWeeklyOff` | in | `BIT` |
| `@PrefixHoliday` | in | `BIT` |
| `@SuffixHoliday` | in | `BIT` |
| `@CreaditOnStatusChange` | in | `BIT` |
| `@LossOfPay` | in | `BIT` |
| `@RecoverLeaveBalance` | in | `BIT` |
| `@BusinessUnit` | in | `VARCHAR(MAX)` |
| `@Location` | in | `VARCHAR(MAX)` |
| `@Grade` | in | `VARCHAR(MAX)` |
| `@Calendar` | in | `VARCHAR(MAX)` |
| `@AllotLeaveEmployeeStatus` | in | `VARCHAR(MAX)` |
| `@AvailLeaveEmployeeStatus` | in | `VARCHAR(MAX)` |
| `@ClubWith` | in | `VARCHAR(MAX)` |
| `@UpdatedBy` | in | `INT` |
| `@Employerid` | in | `INT` |
| `@IsLeaveTypeCompOff` | in | `CHAR(1)` |
| `@ColorCode` | in | `VARCHAR(300)` |
| `@Pastdatepullback` | in | `CHAR(1)` |
| `@Futuredatepullback` | in | `CHAR(1)` |
| `@PastPullbackNoDays` | in | `INT` |
| `@FuturePullbackNoDays` | in | `INT` |
| `@PastPullbackApplicableType` | in | `CHAR(1)` |
| `@FuturePullbackApplicableType` | in | `CHAR(1)` |
| `@NumberOfDaysAutoApproval` | in | `INT` |
| `@EnableForAutoApproval` | in | `VARCHAR(30)` |
| `@IsEnableAutoApproval` | in | `BIT` |
| `@MaritalStatusIds` | in | `VARCHAR(100)` |
| `@CurrentYearNegativeBalanceAllowed` | in | `BIT` |
| `@CurrentYearNegativeBalanceLimit` | in | `NUMERIC(9` |
| `@IsDateValidationRequired` | in | `BIT` |
| `@IsDateValidationBasedOnDOB` | in | `BIT` |
| `@IsDateValidationBasedOnWeddingDate` | in | `BIT` |
| `@IsLeaveRequestAllowedOnDiffDates` | in | `BIT` |
| `@IsApplyLeavesInNoticePeriod` | in | `BIT` |
| `@MaxLimitBasedOn` | in | `VARCHAR(100)` |
| `@MaxLimitDaysInNP` | in | `NUMERIC(9` |
| `@MaxLimitInDays` | in | `INT` |
| `@MinLeaveAvailOption` | in | `VARCHAR(100)` |
| `@MaxLeaveAvailOption` | in | `VARCHAR(100)` |
| `@InterveningHolidayOptions` | in | `VARCHAR(20)` |
| `@InterveningWeeklyOffOptions` | in | `VARCHAR(20)` |
| `@IsAutoCalculateToDate` | in | `BIT` |
| `@LeaveType` | in | `VARCHAR(100)` |
| `@AlwLeaveReqinMultipleofMin` | in | `BIT` |
| `@MaximumHoursPerDay` | in | `NUMERIC(9` |
| `@MaximumHoursPerWeek` | in | `NUMERIC(9` |
| `@MaximumHoursPerMonth` | in | `NUMERIC(9` |
| `@MaximumHoursPerQuarter` | in | `NUMERIC(9` |
| `@MaximumHoursPerHalfYear` | in | `NUMERIC(9` |
| `@MaximumHoursPerYear` | in | `NUMERIC(9` |
| `@IsDisplayOnSalarySlip` | in | `BIT` |
| `@DisplayOnSalarySlipOptions` | in | `VARCHAR(100)` |
| `@IsLeaveLapseNCarryFwdApp` | in | `BIT` |
| `@IsMaxRequestEnabled` | in | `BIT` |
| `@MaxRequestCount` | in | `INT` |
| `@MaxRequestFrequency` | in | `VARCHAR(50)` |
| `@AllowSingleDayLeave` | in | `BIT` |
| `@AllowMultipleDaysLeave` | in | `BIT` |
| `@LeaveEvent` | in | `BIT` |
| `@DocRequirementType` | in | `TINYINT` |
| `@DocThresholdValue` | in | null |
| `@IsLeaveTypeEncashable` | in | `BIT` |
| `@LeaveEventJson` | in | `NVARCHAR(MAX)` |
| `@LeavePolicyJson` | in | `NVARCHAR(MAX)` |
| `@LeavePolicyParameterValueJson` | in | `NVARCHAR(MAX)` |
| `@LLCFConfigDetailsJson` | in | `NVARCHAR(MAX)` |
| `@PolicyLLCFPreferenceType` | in | `VARCHAR(50)` |
| `@IsLeaveReasonFreeText` | in | `BIT` |
| `@IsLeaveAllowedOnHoliday` | in | `BIT` |
| `@IsLeaveAllowedOnWeeklyOff` | in | `BIT` |
| `@AllowAggregation` | in | `BIT` |
| `@IsStrictMode` | in | `BIT` |
| `@AllowSplitting` | in | `BIT` |
| `@AllowInterveningHalfDay` | in | `BIT` |
| `@HO_PrioritizeWorkAttendance` | in | `BIT` |
| `@WO_PrioritizeWorkAttendance` | in | `BIT` |
| `@IsLeaveExtendedForInterveningDays` | in | `BIT` |
| `@WO_ThresholdEnabled` | in | `BIT` |
| `@WO_ThresholdDays` | in | `INT` |
| `@WO_ThresholdCountMode` | in | `CHAR(1)` |
| `@HO_ThresholdEnabled` | in | `BIT` |
| `@HO_ThresholdDays` | in | `INT` |
| `@HO_ThresholdCountMode` | in | `CHAR(1)` |
| `@LeaveCategory` | in | `VARCHAR(30)` |
| `@EventKey` | in | `VARCHAR(50)` |
| `@AllowCompOffBeforeEarnedDate` | in | `BIT` |
| `@AllowCompOffAfterExpiryDate` | in | `BIT` |

The signature continues with 7 more parameters in the script.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_LA_LeaveType_Update
  participant N0 as SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
  participant N1 as SP_CM_GetDataforRequestWorkFlows
  participant N2 as SP_CM_GetDataForEmailNotification
  participant N3 as USP_LA_LeaveType_History_Save
  participant N4 as USP_LA_LeaveType_Event_History_Save
  participant N5 as USP_LA_LeaveType_Policy_Update
  participant N6 as FN_CM_GetApproverList
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
  Main->>N3: call
  Main->>N4: call
  Main->>N5: call
  Main->>N6: call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle` | procedure | Called while this object runs | [SP_CM_GetWorkflowTreeXmlDetailsByPageTitle](/docs/database/hrms/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle) |
| `SP_CM_GetDataforRequestWorkFlows` | procedure | Called while this object runs | [SP_CM_GetDataforRequestWorkFlows](/docs/database/hrms/SP_CM_GetDataforRequestWorkFlows) |
| `SP_CM_GetDataForEmailNotification` | procedure | Called while this object runs | [SP_CM_GetDataForEmailNotification](/docs/database/hrms/SP_CM_GetDataForEmailNotification) |
| `USP_LA_LeaveType_History_Save` | procedure | Called while this object runs | [USP_LA_LeaveType_History_Save](/docs/database/hrms/USP_LA_LeaveType_History_Save) |
| `USP_LA_LeaveType_Event_History_Save` | procedure | Called while this object runs | [USP_LA_LeaveType_Event_History_Save](/docs/database/hrms/USP_LA_LeaveType_Event_History_Save) |
| `USP_LA_LeaveType_Policy_Update` | procedure | Called while this object runs | [USP_LA_LeaveType_Policy_Update](/docs/database/hrms/USP_LA_LeaveType_Policy_Update) |
| `FN_CM_GetApproverList` | function | Called while this object runs | [FN_CM_GetApproverList](/docs/database/hrms/FN_CM_GetApproverList) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_Update.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TAdminChangesApprovalDetails` | read or write |
| `TAdminChangesApprovals` | read or write |
| `TEmailNotification` | read or write |
| `TEmployee` | read or write |
| `TEmployeeInfo` | read or write |
| `tLeaveBalance` | read or write |
| `TLeaveBalanceLedger` | read or write |
| `TLeaveBusinessUnit` | read or write |
| `TLeaveBusinessUnit_History` | read or write |
| `TLeaveCalendar` | read or write |
| `TLeaveCalendar_History` | read or write |
| `TLeaveClubWith` | read or write |
| `TLeaveClubWith_History` | read or write |
| `TLeaveEmployeeStatus` | read or write |
| `TLeaveEmployeeStatus_History` | read or write |
| `TLeaveEventDetail_ChangeApproval` | read or write |
| `tLeaveEventDetails` | read or write |
| `TLeaveGrade` | read or write |
| `TLeaveGrade_History` | read or write |
| `TLeaveLapseCarryForwardConfig_ChangeApproval` | read or write |
| `TLeaveLocation` | read or write |
| `TLeaveLocation_History` | read or write |
| `TLeavePolicy_ChangeApproval` | read or write |
| `TLeavePolicyParameterValue_ChangeApproval` | read or write |
| `TLeaveRequest` | read or write |
| `TLeaveRequestDays` | read or write |
| `TLeaveTypeMaster` | read or write |
| `TRequestWorkflows` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_LA_LeaveType_Update] --> Run[Apply the inputs]
  Run --> Child[SP_CM_GetWorkflowTreeXmlDetailsByPageTitle]
  Child --> Done[Return the result]
```
