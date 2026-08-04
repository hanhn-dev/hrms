---
sources:
  - HRMS-DATABASE/HRMS/TABLES
  - HRMS-DATABASE/HRMS/STOREPROCEDURE
confidence: high
last-analyzed: 2026-06-26
---

# Domain Overview

The core domain concepts and how they relate. The HRMS domain centers on
**people employed by tenant organizations, the policies governing their work,
and the approval-routed requests that change their state.**

## Layering

```
Tenant layer        TEmployerDetails (Employerid) — org tree, config, feature flags
   │
Identity/Access     TUsers ─ TRoles ─ TRolePagesMapping ─ TModulePages
   │
People              TEmployee + satellite TEmployee* (bank, contact, family, assets…)
   │
Org taxonomy        TBusinessUnit · TDepartment · TGrade · TLocation · Designation
   │
Policy              TLeaveTypeMaster · TShift* · TAttendanceConfiguration · workflows
   │
Transactions        TLeaveRequest · TAttendanceTransaction · TResignation* · expenses…
   │
Approval engine     TWorkflowManagement → TRequestWorkflows → SP_ApproveWorkFlowRequest
   │
Ledgers/audit       TLeaveBalanceLedger · TAuditTrail · TActivityLog · *_History
```

## Concept clusters

- **Org & people**: Employer (tenant) → Employees, classified by BU/dept/grade/
  location/role. Identity (`TUsers`) is separate from the HR person (`TEmployee`),
  linked via `TUserEmployee`.
- **Leave**: configurable leave types (`TLeaveTypeMaster`) → applications
  (`TLeaveRequest`) → balances (`TLeaveBalanceLedger`). See
  `leave-lifecycle.md`.
- **Attendance**: shifts/config → punches (`TAttendanceTransaction`) →
  regularization requests. Capture mode is per-tenant.
- **Employee lifecycle events**: hiring/recruitment (RRS), confirmation (CMS),
  performance (PMS), resignation/termination — each surfaced as approvable
  request types. See `employee-lifecycle.md`.
- **Cross-cutting approval**: every state-changing request and most config
  changes route through one engine. See `approval-workflow.md`.
- **Adjacent domains** (separate databases): timesheets, training, travel &
  expense, resource allocation, room booking, surveys.

## How state changes happen (the recurring pattern)

A change is rarely applied directly. The pattern is:

1. **Create** a transaction row (e.g. `TLeaveRequest`) in a pending status.
2. **Route** by materializing `TRequestWorkflows` rows for the mapped workflow.
3. **Approve** level-by-level via `SP_ApproveWorkFlowRequest` (keyed by
   `RequestType`).
4. **Apply side effects** on final approval (ledger debit, status flip,
   notifications).

This pattern is the unifying idea of the domain; the individual `domain/*` pages
describe the per-concept variations of it.
