---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TUsers.sql
  - HRMS-DATABASE/HRMS/TABLES/TRoles.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
confidence: medium
last-analyzed: 2026-06-26
---

# Personas

Actor types, inferred from features, request types, and access control. Roles
are tenant-configurable (`TRoles`), so these are functional personas, not fixed
role names.

## Human actors

- **Employee (self-service)** — applies for leave/WFH, regularizes attendance,
  submits timesheets/expenses/travel, takes training and surveys, requests
  comp-off, resigns. The default `TUsers.UserType = 'E'` (Employee)
  (`TUsers.sql:10`).
- **Manager / Approver** — appears as `TRequestWorkflows.ManagerId` at one or
  more approval levels; acts via `SP_ApproveWorkFlowRequest`/`...Reject...`. Any
  employee can be an approver for someone else's request.
- **HR Admin** — configures leave types, workflows, roles & page access, org
  taxonomy; runs reports; manages confirmation (CMS) and performance (PMS)
  cycles; initiates terminations. Drives the `SP_Admin*`/`SP_AdminLM_*`/
  `Sp_AdminPMS_*` surface.
- **Recruiter** — recruitment/RRS flows (`InitiateHiring`, `InterviewFeedback`,
  `RecruitmentManagement`).
- **Super/Global admin** — `IsGlobalAccess='Y'` on `TUsers`/`TRoles` grants
  cross-scope access (`TUsers.sql:19`, `TRoles.sql:11`); likely spans an org
  group via the employer tree.

## Machine / system actors

- **Scheduler jobs** — run leave truncation/rollover, auto-confirmation,
  birthday/anniversary and password-expiry notifications.
- **Attendance devices / geo / IP feeds** — push punches into
  `TAttendanceTransaction` / `TGeoTagging*`.
- **SSIS import jobs** — bulk-load tenant data via `*_SSIS_Temp_*` staging.
- **Timesheet integration partners** — exchange data via TIMEPORT `TIntegration*`.
- **ELMAH logger** — writes `ELMAH_Error`.

## Tenant context

Every human actor exists within an **Employer** (`Employerid`), which may be part
of an organization group (`ParentEmployerid`/`RootEmployerId`). See
`../architecture/tenancy-model.md`.
