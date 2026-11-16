---
object: USP_GeoTracking_EmployeeList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_GeoTracking_EmployeeList.sql
last-analyzed: 2026-11-09
---

# USP_GeoTracking_EmployeeList

## What it does

Returns employee ids visible to the caller based on role type from `USP_TFN_TUserEmployeeRole`. Administrator/HR get all employees under the root employer. Manager get same business-unit employees unioned with direct/indirect reportees. Employee role returns only self.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | Operator whose role drives the list |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_GeoTracking_EmployeeList
  participant Role as USP_TFN_TUserEmployeeRole
  participant Tree as Fn_DirectIndirectReportee
  Caller->>Main: execute
  Main->>Role: resolve RoleType
  alt Manager
    Main->>Tree: reportees
  end
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_BGV_GetAllActiveEmployee` | procedure | [SP_BGV_GetAllActiveEmployee](/docs/database/hrms/SP_BGV_GetAllActiveEmployee) |
| `USP_GeoTrackingDistanceReport` | procedure | No page yet |
| `USP_AdminWM_GetBusinessUnitByOrg_EmployeeId` | procedure | No page yet |
| `SP_GetEmployeeListByOrgAndBU` | procedure | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_TFN_TUserEmployeeRole` | function | always | [USP_TFN_TUserEmployeeRole](/docs/database/hrms/USP_TFN_TUserEmployeeRole) |
| `Fn_DirectIndirectReportee` | function | Manager branch | [Fn_DirectIndirectReportee](/docs/database/hrms/Fn_DirectIndirectReportee) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_GeoTracking_EmployeeList.sql`.
2. Read `@RoleType` from `USP_TFN_TUserEmployeeRole`.
3. Administrator/HR: employees whose employer shares the caller’s `RootEmployerId`.
4. Manager: same `BusinessUnitID` employees union `Fn_DirectIndirectReportee`.
5. Employee: return `@EmployeeId` only.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployerDetails` | read |
| `dbo.TEmployeeInfo` | read |

## Flow

```mermaid
flowchart TD
  Start[USP_GeoTracking_EmployeeList] --> Role[Resolve RoleType]
  Role --> Admin{Administrator or HR}
  Admin -->|yes| Root[Root employer employees]
  Admin -->|no| Mgr{Manager}
  Mgr -->|yes| BU[BU peers plus reportees]
  Mgr -->|no| Self[Self only]
```
