---
sources:
  - HRMS-DATABASE/HRMS
  - HRMS-DATABASE/HRM-TIMEPORT
  - HRMS-DATABASE/HRMS-TRAINING
  - HRMS-DATABASE/HRMS_TRAVELNEXPENSE
  - HRMS-DATABASE/HRMS-RESOURCEALLOCATION
  - HRMS-DATABASE/HRMS-CRBBOOKING
  - HRMS-DATABASE/HRMS-SURVEY
confidence: high
last-analyzed: 2026-06-26
---

# Module Catalog

Inventory of the seven modules. Each module is a **separate SQL Server database**
deployed as its own folder of SQL object scripts. Object counts are
`*.sql` files under each folder's `TABLES/`, `STOREPROCEDURE/` (+ `Stored
Procedures/`), `FUNCTIONS/`, `VIEWS/` (counts include `_bkp*`/`_History` and
dated backup scripts, so treat them as upper bounds).

| Module folder | Database name | Tables | SPs | Functions | Views | Purpose |
|---|---|---:|---:|---:|---:|---|
| `HRMS` | `HRMS_PROD` | 1106 | 4132 | 302 | 155 | Core HR: employees, employers (tenants), roles/access, leave, attendance, payroll/salary, resignation, BGV, recruitment (RRS), confirmation (CMS), performance (PMS), the approval engine, ELMAH error log. |
| `HRM-TIMEPORT` | `HRM_CL_TIMEPORT` | 86 | 164 | 61 | 0 | Timesheets (`TTSEmpTimeSheet`), timesheet status workflow, and an integration layer (`TIntegration*`) for syncing with external partners. |
| `HRMS-TRAINING` | `Training` | 78 | 279 | 22 | 3 | Training management: trainings, assignments, TNI (training-needs identification), quizzes, assessments, evaluations, feedback. |
| `HRMS_TRAVELNEXPENSE` | `TravelNExpense_Prod` | 59 | 270 | 21 | 4 | Travel requests, itineraries, multi-category expense claims (`TEXPENSE_*`), advances, payment setup. |
| `HRMS-RESOURCEALLOCATION` | `ResourceAllocation` | 23 | 79 | 8 | 0 | Resource/staffing allocation, allocation owners, lock matrix, reallocation requests. |
| `HRMS-CRBBOOKING` | `HRM_CRBooking_Prod` | 10 | 30 | 1 | 0 | Conference-room and virtual-room booking. |
| `HRMS-SURVEY` | `SURVEY` | 5 | 38 | 1 | 1 | Employee surveys: definitions, questions, participants. |

## Per-module object layout

Every module folder follows the same physical layout (the standard SSDT-style
object-per-file export):

```
<MODULE>/
  TABLES/        CREATE TABLE scripts (+ *_History, *_bkp<date> backups)
  STOREPROCEDURE/ (HRMS also has a second "Stored Procedures/" folder)
  FUNCTIONS/     scalar + table-valued functions (Fn_*, TFN_*)
  VIEWS/         (absent in TIMEPORT, CRB, RAS)
  SYNONYMS/      cross-database object aliases (the inter-module seam)
  UDT/           user-defined table types (TVP parameters; absent in CRB, SURVEY)
  DDL/ DML/      one-off migration / data-fix scripts (HRMS only at top level)
```

## Cross-cutting subsystems inside the core (`HRMS`)

These are vertical feature slices within `HRMS_PROD`, not separate databases:

- **Approval engine** — `TWorkflowManagement` + `TRequestWorkflows` +
  `SP_ApproveWorkFlowRequest` / `SP_RejectWorkFlowRequest`. See
  `../domain/approval-workflow.md`.
- **Admin-change governance** — config edits to master data are themselves routed
  for approval via `SP_AddAdminChanges` + `TAdminChangesApprovals`.
- **Leave management (LM)** — `TLeaveTypeMaster`, `TLeaveRequest`,
  `TLeaveBalanceLedger`; `SP_AdminLM_*` admin procs. See
  `../domain/leave-lifecycle.md`.
- **Attendance** — `TAttendanceTransaction`, `TAttendance`,
  `TAttendanceRegularization`, geo/IP capture (`TGeoTagging*`, `IsIPBasedAttendance`).
- **Security / access control** — `TRoles`, `TRolePagesMapping`,
  `TRoleBasePagesAccess`, `TModulePages`; login audit `TDeviceInvalidLoginAttemptDetails`,
  `TAuditTrail`. See `../architecture/auth-flow.md`.
- **Reporting rule engine** — `OV_Rule_*` procedures
  (`OV_Rule_LeaveAttendance_*_{Card,Detail,Summary}`) produce dashboard
  card/detail/summary report shapes.
- **Error logging** — `ELMAH_Error` table with `ELMAH_LogError` / `ELMAH_GetErrorXml`.
