---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TLeaveTypeMaster.sql
  - HRMS-DATABASE/HRMS/TABLES/TRequestWorkflows.sql
  - HRMS-DATABASE/HRMS/TABLES/TLeaveBalanceLedger.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AddNewLeaveTypeMaster.sql
confidence: medium
last-analyzed: 2026-06-26
---

# Invariants

Rules that must always hold, grouped by layer. Each is either enforced by a
constraint (cited) or enforced by procedure logic (noted). Procedure-enforced
invariants can be violated by code that bypasses the procedure — treat them as
contracts, not guarantees.

## Tenancy
- **Every operational row belongs to exactly one tenant.** `Employerid` is set
  on insert; reads/writes must filter by it. Enforced by convention in procedures
  (no row-level-security policy found). See `../architecture/tenancy-model.md`.
- **A leave code is unique within a tenant.** Constraint: composite PK
  `(LeaveCode, Employerid)` on `TLeaveTypeMaster` (`TLeaveTypeMaster.sql:63`).
- **At most one active comp-off leave type per tenant.** Procedure-enforced:
  `SP_AddNewLeaveTypeMaster` rejects a second active `IsLeaveTypeCompOff='Y'`
  type for the same `Employerid` ("Another leave type for comp off already
  exists.") (`SP_AddNewLeaveTypeMaster.sql:80-92`).

## Identity / access
- **A user belongs to a role that exists.** Constraint: FK
  `TUsers.RoleID → TRoles.RoleID` (`TUsers.sql:24`).
- **A workflow belongs to a module that exists.** Constraint: FK
  `TWorkflowManagement.ModuleId → THrmsModules.ModuleId` (`TWorkflowManagement.sql:21`).

## Approval engine
- **A routing row is acted on at most once.** The engine selects only
  `ApproveStatus='P' AND IsApprove=0`; approval flips `IsApprove=1`, so the same
  row is never re-approved (`SP_ApproveWorkFlowRequest.sql:89`). Idempotency
  invariant — procedure-enforced.
- **Approval proceeds in level order.** Levels advance one at a time via
  `ApprovalLevel`; a request is fully approved only when its last level is
  approved. Procedure-enforced.
- **`ApproveStatus` is single-character.** `TRequestWorkflows.ApproveStatus
  CHAR(1)`, pending = `'P'` (`TRequestWorkflows.sql:9`).

## Leave balances
- **The balance ledger is append-only and self-reconciling.** Each
  `TLeaveBalanceLedger` row records `openingbalance` and `closingbalance`; the
  closing of one transaction should equal the opening of the next for the same
  `(Employeeid, LeaveCode, Employerid)`. Procedure-enforced (no DB constraint).
- **A debit must reference its request.** Leave-debit ledger rows carry
  `leaveRequestid` (`TLeaveBalanceLedger.sql:11`).

## Soft-delete / history
- **Records are deactivated, not destroyed.** Active state via `IsActive CHAR(1)`
  (`'Y'`/`'N'`) and/or `IsDelete`/`isdeleted BIT`; superseded versions move to
  `*_History` tables. Convention across tables.

## Config governance
- **A config change to a page with a mapped workflow must be approved before it
  takes effect.** When a workflow is mapped to the page, the edit is routed via
  `SP_AddAdminChanges` instead of applied directly
  (`SP_AddNewLeaveTypeMaster.sql:95-545` vs the `Else` direct-apply branch `:547`).

> ⚠️ Known invariant violation risk: `TLeaveRequest.LeaveStatus` lacks a CHECK
> constraint and is written with inconsistent encodings across procedures (see
> `../glossary/terminology.md`). No invariant guarantees a single valid value set.
