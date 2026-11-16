---
object: Sp_EmployeeDashboard_Chart_DrillDown
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_EmployeeDashboard_Chart_DrillDown.sql
last-analyzed: 2026-11-09
---

# Sp_EmployeeDashboard_Chart_DrillDown

## What it does

Returns the employee detail rows behind an Employee Dashboard card or distribution-chart slice. It applies the same access scope and filters as the aggregate procedures, then narrows further by `@CategoryName`, `@SubCategoryName`, `@ExcludeSubCategory`, and `@Type` (`card` vs `chart`). Used for every drill-down except Attrition Trend (that path uses `Sp_EmployeeDashboard_AttritionChart_DrillDown`).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LoginID` | in | Logged-in employee used for location and BU scope |
| `@EmployerID` | in | Employer whose workforce is queried |
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
| `@WorkForceStatus` | in | Active / InActive / OnNotice path |
| `@DOJ_FromDate` | in | Optional DOJ range start |
| `@DOJ_ToDate` | in | Optional DOJ range end |
| `@LWD_FromDate` | in | Optional LWD range start |
| `@LWD_ToDate` | in | Optional LWD range end |
| `@CategoryName` | in | Card or chart category (for example Total Active Employees, Skill Distribution) |
| `@SubCategoryName` | in | Slice label within the category |
| `@ExcludeSubCategory` | in | Labels to exclude when the slice is Others |
| `@Type` | in | `card` or `chart` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_EmployeeDashboard_Chart_DrillDown
  participant Loc as SP_EmployeeDashboard_GetLocationByEmployeeId
  participant Bu as SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId
  participant Title as SP_CM_GetTitle
  Caller->>Main: execute
  Main->>Loc: load @WorkLocation
  Main->>Bu: load @BusinessUnit
  Main->>Title: load @Designation
  Main->>Main: category branches return employee rows
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `EmployeeRepository.getDrillDownData` | app | [Employee Dashboard](/docs/guides/employee-management/employee-dashboard) |

No other procedure in `STOREPROCEDURE/` executes it.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_EmployeeDashboard_GetLocationByEmployeeId` | procedure | always at start | [SP_EmployeeDashboard_GetLocationByEmployeeId](/docs/database/hrms/SP_EmployeeDashboard_GetLocationByEmployeeId) |
| `SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId` | procedure | always at start | [SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId](/docs/database/hrms/SP_EmployeeDashboard_GetBusinessUnitByOrg_EmployeeId) |
| `SP_CM_GetTitle` | procedure | always at start | [SP_CM_GetTitle](/docs/database/hrms/SP_CM_GetTitle) |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_EmployeeDashboard_Chart_DrillDown.sql`:

1. EXEC location, business-unit, and title helpers into table variables.
2. Build the same supporting temps as the chart/card procedures (employment types, domains, skills, experience, age, resignation).
3. Build the filtered employee working set for the employer and filters.
4. Branch on `@CategoryName` / `@Type` to SELECT the matching employee detail columns for that card or chart slice.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TGender` | read |
| `dbo.TMEmploymentTypes` | read |
| `dbo.TEmploymentTypeClubWith` | read |
| `dbo.TEmployeeDomainDetails` | read |
| `dbo.TSkillDomainMaster` | read |
| `dbo.TEmployeeSkillDetails` | read |
| `dbo.TMSkills` | read |
| `dbo.TEmployeeRoleMaster` | read |
| `dbo.TResignationDetails` | read |
| `dbo.TResignation` | read |
| `dbo.TDailyRegisterNew` | read |
| `dbo.TAttendanceTransaction` | read |
| `dbo.TWorkFromHomeRequest` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["Sp_EmployeeDashboard_Chart_DrillDown"] --> Scope["Load location BU designation scope"]
  Scope --> Filter["Build filtered employee set"]
  Filter --> Branch["Branch on CategoryName and Type"]
  Branch --> Done["Return employee detail rows"]
```
