---
object: USP_GetEmployeeLeaveAttendanceDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_GetEmployeeLeaveAttendanceDetails.sql
last-analyzed: 2026-11-16
---

# USP_GetEmployeeLeaveAttendanceDetails

## What it does

Nested yearly leave/attendance detail for My Dashboard calendar card (Card 9).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employeeid` | in | `INT` |
| `@Month` | in | `INT` |
| `@Year` | in | `INT` |
| `@IncludeLeaveSummary` | in | `BIT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_GetEmployeeLeaveAttendanceDetails
  participant UFN_LA_LeaveType_EmployeeBalanceSummary_Get as UFN_LA_LeaveType_EmployeeBalanceSummary_Get
  participant FN_GetLocalTime as FN_GetLocalTime
  participant FN_Get_EmployeeWorkedMinute as FN_Get_EmployeeWorkedMinute
  participant UFN_GET_EmployeeShift as UFN_GET_EmployeeShift
  participant FN_CM_GetLeaveChk as FN_CM_GetLeaveChk
  participant UFN_GetEmployeeDayDetails as UFN_GetEmployeeDayDetails
  participant UFN_MinutesToDuration as UFN_MinutesToDuration
  Caller->>Main: execute
  Main->>UFN_LA_LeaveType_EmployeeBalanceSummary_Get: nested call
  Main->>FN_GetLocalTime: nested call
  Main->>FN_Get_EmployeeWorkedMinute: nested call
  Main->>UFN_GET_EmployeeShift: nested call
  Main->>FN_CM_GetLeaveChk: nested call
  Main->>UFN_GetEmployeeDayDetails: nested call
  Main->>UFN_MinutesToDuration: nested call
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_LeaveAttendance_DashBoard` | procedure | [SP_LeaveAttendance_DashBoard](/docs/database/hrms/SP_LeaveAttendance_DashBoard) |

Also invoked via `SP_LeaveAttendance_DashBoard` yearly attendance card.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `UFN_LA_LeaveType_EmployeeBalanceSummary_Get` | function | when reached in script | [UFN_LA_LeaveType_EmployeeBalanceSummary_Get](/docs/database/hrms/UFN_LA_LeaveType_EmployeeBalanceSummary_Get) |
| `FN_GetLocalTime` | function | when reached in script | [FN_GetLocalTime](/docs/database/hrms/FN_GetLocalTime) |
| `FN_Get_EmployeeWorkedMinute` | function | when reached in script | [FN_Get_EmployeeWorkedMinute](/docs/database/hrms/FN_Get_EmployeeWorkedMinute) |
| `UFN_GET_EmployeeShift` | function | when reached in script | [UFN_GET_EmployeeShift](/docs/database/hrms/UFN_GET_EmployeeShift) |
| `FN_CM_GetLeaveChk` | function | when reached in script | [FN_CM_GetLeaveChk](/docs/database/hrms/FN_CM_GetLeaveChk) |
| `UFN_GetEmployeeDayDetails` | function | when reached in script | [UFN_GetEmployeeDayDetails](/docs/database/hrms/UFN_GetEmployeeDayDetails) |
| `UFN_MinutesToDuration` | function | when reached in script | [UFN_MinutesToDuration](/docs/database/hrms/UFN_MinutesToDuration) |

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_GetEmployeeLeaveAttendanceDetails.sql`, accept the declared parameters and set `NOCOUNT` / read-uncommitted as scripted.
2. Build filter / reportee temp sets when the script calls nested helpers.
3. Aggregate leave/attendance (or tab ACL) rows and return the chart or card result set(s).

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployeeInfo` | read |
| `dbo.TCalendarMaster` | read |
| `dbo.TCustomerSettings` | read |
| `dbo.TCalenderDays` | read |
| `dbo.TDailyRegisterNew` | read |
| `dbo.TSHIFTMASTER` | read |
| `dbo.TEmployee` | read |
| `dbo.TLeaveRequestDays` | read |
| `dbo.TLeaveRequest` | read |
| `dbo.TLeaveTypeMaster` | read |
| `dbo.D` | read |
| `dbo.TAttendanceRegularizationDays` | read |
| `dbo.TWorkfromHomeRequestDays` | read |
| `dbo.THolidayMaster` | read |
| `dbo.TOptionalHolidayRequest` | read |
| `dbo.dbo` | read |
| `dbo.TEmployeeDayWiseAttendanceStatus` | read |
| `dbo.tLeaveBalance` | read |

## Flow

```mermaid
flowchart TD
  Start["USP_GetEmployeeLeaveAttendanceDetails"] --> Work["Run scripted reads"]
  Work --> UFN_LA_LeaveType_EmployeeBalanceSummary_Get["UFN_LA_LeaveType_EmployeeBalanceSummary_Get"]
  Work --> FN_GetLocalTime["FN_GetLocalTime"]
  Work --> FN_Get_EmployeeWorkedMinute["FN_Get_EmployeeWorkedMinute"]
  Work --> UFN_GET_EmployeeShift["UFN_GET_EmployeeShift"]
  Work --> FN_CM_GetLeaveChk["FN_CM_GetLeaveChk"]
  Work --> UFN_GetEmployeeDayDetails["UFN_GetEmployeeDayDetails"]
  Work --> Done["Return result set(s)"]
```
