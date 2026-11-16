---
object: Sp_Employeejoinleavechart
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_Employeejoinleavechart.sql
last-analyzed: 2026-11-09
---

# Sp_Employeejoinleavechart

## What it does

Builds the Attrition Trend series for Employee Dashboard: employees joining and leaving across `@fromDate`–`@toDate` for one employer, after the usual location / business-unit / designation scope and optional attribute filters. The UI chart (`ChartByAttritionTrend`) posts to `/employees/GetAttritionTrendData`, which executes this procedure.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@employeeId` | in | Logged-in employee used for location and BU scope |
| `@employerId` | in | Employer whose join/leave series is built |
| `@fromDate` | in | Series window start |
| `@toDate` | in | Series window end |
| `@BusinessUnitID` | in | Optional business unit filter |
| `@BaseLocationID` | in | Optional base location ids |
| `@WorkLocationID` | in | Optional work location ids |
| `@Gender` | in | Optional gender filter |
| `@AgeRange` | in | Optional age-range labels |
| `@DesignationID` | in | Optional designation ids |
| `@EmploymentTypeID` | in | Optional employment type ids |
| `@RoleID` | in | Optional role ids |
| `@SkillID` | in | Optional skill ids |
| `@DomainID` | in | Optional domain ids |
| `@ExperienceRange` | in | Optional experience labels |
| `@WorkForceStatus` | in | When null, Active + InActive + OnNotice are included together |
| `@DOJ_FromDate` | in | Optional DOJ range start |
| `@DOJ_ToDate` | in | Optional DOJ range end |
| `@LWD_FromDate` | in | Optional LWD range start |
| `@LWD_ToDate` | in | Optional LWD range end |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_Employeejoinleavechart
  participant Loc as SP_EmployeeDashboard_GetLocationByEmployeeId
  participant Bu as SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId
  participant Title as SP_CM_GetTitle
  Caller->>Main: execute
  Main->>Loc: load @WorkLocation
  Main->>Bu: load @BusinessUnit
  Main->>Title: load @Designation
  Main->>Main: period join and leave aggregates
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `EmployeeRepository.GetAttritionTrendData` | app | [Employee Dashboard](/docs/guides/employee-management/employee-dashboard) |

No other procedure in `STOREPROCEDURE/` executes it.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_EmployeeDashboard_GetLocationByEmployeeId` | procedure | always at start | [SP_EmployeeDashboard_GetLocationByEmployeeId](/docs/database/hrms/SP_EmployeeDashboard_GetLocationByEmployeeId) |
| `SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId` | procedure | always at start | [SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId](/docs/database/hrms/SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId) |
| `SP_CM_GetTitle` | procedure | always at start | [SP_CM_GetTitle](/docs/database/hrms/SP_CM_GetTitle) |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_Employeejoinleavechart.sql`:

1. EXEC location, business-unit, and title helpers into table variables.
2. Build employment-type and experience helper temps; assemble `#FilteredEmployees` for the workforce-status rule (null means Active + InActive + OnNotice).
3. Backfill last working dates from resignation / termination / employee-info sources where needed.
4. Aggregate join and leave counts across the `@fromDate`–`@toDate` window for the chart series.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TGender` | read |
| `dbo.TMEmploymentTypes` | read |
| `dbo.TEmploymentTypeClubWith` | read |
| `dbo.TEmployeeRoleMaster` | read |
| `dbo.TResignationDetails` | read |
| `dbo.TResignation` | read |
| `dbo.TTerminationDetail` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["Sp_Employeejoinleavechart"] --> Scope["Load location BU designation scope"]
  Scope --> Filter["Build #FilteredEmployees"]
  Filter --> Series["Aggregate joins and leaves by period"]
  Series --> Done["Return attrition series"]
```
