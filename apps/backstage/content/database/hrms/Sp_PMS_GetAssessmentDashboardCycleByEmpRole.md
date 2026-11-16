---
object: Sp_PMS_GetAssessmentDashboardCycleByEmpRole
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetAssessmentDashboardCycleByEmpRole.sql
last-analyzed: 2026-11-09
---

# Sp_PMS_GetAssessmentDashboardCycleByEmpRole

## What it does

Returns active appraisal cycle / review-frequency options for the PMS Dashboard. HR and Admin roles (role ids 1, 2, 9) see every active cycle for the employer whose form active date has passed. Other roles see only cycles that include a self-appraisal for a direct or indirect reportee of `@EmployeeId`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | Signed-in employee used for role and reportee scope |
| `@EmployerId` | in | Employer whose cycles are listed |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_PMS_GetAssessmentDashboardCycleByEmpRole
  participant Fn as Fn_DirectIndirectReportee
  Caller->>Main: execute
  alt role is 1 2 or 9
    Main->>Main: list active TPMSAppraisalCycles with review frequencies
  else other roles
    Main->>Fn: reportees of @EmployeeId
    Main->>Main: cycles with self-appraisal for those employees
  end
```

## Callers

No other procedure or function calls this object. App caller: `performanceAssessmentDAL.GetAssessmentCycles` from PMS Dashboard.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_DirectIndirectReportee` | function | non-admin / non-HR role branch | [Fn_DirectIndirectReportee](/docs/database/hrms/Fn_DirectIndirectReportee) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetAssessmentDashboardCycleByEmpRole.sql`:

1. Read `Employername` from `TPMSEmployerConfiguration` for `@EmployerId` into a local.
2. Resolve `@RoleID` from `TUsers` / `TRoles` / `TUserEmployee` / `TEmployee` for the active `@EmployeeId`.
3. When role is 1, 2, or 9, select distinct cycle id, cycle name plus review frequency label, and `ReviewFrequencyId` from active `tpmsappraisalcycles` joined to `TPMS_AppraisalReviewFrequency` where frequency status is not Pending and `FormActivedate <= getdate()`.
4. Otherwise select the same columns for cycles that have a `tpmsemployeeselfappraisal` row for an employee in `Fn_DirectIndirectReportee(@EmployeeId, -2)`.
5. Order by cycle id descending, review frequency ascending.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TPMSEmployerConfiguration` | read |
| `dbo.TUsers` | read |
| `dbo.TRoles` | read |
| `dbo.TUserEmployee` | read |
| `dbo.TEmployee` | read |
| `dbo.TPMSAppraisalCycles` | read |
| `dbo.TPMS_AppraisalReviewFrequency` | read |
| `dbo.TPMSEmployeeSelfAppraisal` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_PMS_GetAssessmentDashboardCycleByEmpRole] --> Role[Resolve role for employee]
  Role -->|1 2 9| All[All active employer cycles]
  Role -->|other| Rep[Fn_DirectIndirectReportee then reportee cycles]
```
