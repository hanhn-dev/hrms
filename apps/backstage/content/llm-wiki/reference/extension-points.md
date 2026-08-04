---
sources:
  - HRMS-DATABASE/HRMS/SYNONYMS
  - HRMS-DATABASE/HRMS/TABLES/TWorkflowManagement.sql
  - HRMS-DATABASE/HRMS/TABLES/TRequestWorkflows.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AddNewLeaveTypeMaster.sql
confidence: high
last-analyzed: 2026-06-26
---

# Extension Points

The seams where behaviour is configured or swapped without changing object
definitions. For a database, "extension points" are the configuration-driven
dispatch mechanisms and the cross-database boundary.

## 1. Synonyms — the cross-database boundary

`CREATE SYNONYM [dbo].[X] FOR [TargetDb].[dbo].[X]` is the **only** seam between
the seven databases. Code references the local synonym name; the synonym maps it
to a table in another database (`HRMS/SYNONYMS/TExpense.sql:8` →
`[TRAVELNExpense_Prod].[dbo].[TExpense]`). To repoint a module at a different
database (e.g. dev vs prod, or a renamed DB), you re-`CREATE SYNONYM`, not edit
the consumers. Scripts use `DROP SYNONYM IF EXISTS` then `CREATE` for idempotency.

Boundary rule: a satellite table is consumed in HRMS *only* through its synonym;
direct three-part names in SP bodies should be the exception. Casing of target DB
names is inconsistent (see `module-dependency-graph.md`).

## 2. The approval engine — `RequestType`-dispatched workflow

`SP_ApproveWorkFlowRequest` is a **dispatcher keyed by `@RequestType`**: a single
procedure with a large branch per request type
(`SP_ApproveWorkFlowRequest.sql:114-1342`). Adding a new approvable artifact means:

1. Define/assign a workflow in `TWorkflowManagement` (mapped to a module page via
   `MappedPages`/`ModuleId`, with `RoutingLevels`).
2. On submit, materialize routing rows in `TRequestWorkflows`
   (`RequestType`, `RequestTransid`, `ManagerId`, `ApprovalLevel`, `ApproveStatus='P'`).
3. Add a `@RequestType` branch in `SP_ApproveWorkFlowRequest` /
   `SP_RejectWorkFlowRequest` to apply the type-specific side effects on approval.

Ordering / transaction semantics: approval advances one level at a time; the
engine selects the current pending row by `(RequestTransid, ManagerId,
RequestType, ApproveStatus='P', IsApprove=0)` (`:83-90`). Idempotency is enforced
by the `ApproveStatus='P'` predicate — an already-approved row is not re-selected.
Auto-approve seams: `TWorkflowManagement.IsEnableAutoApproved`/`SkipWorkFlow` and
`TRequestWorkflows.IsAutoApprove`.

## 3. Admin-change governance — config edits routed for approval

Master-data edits are not direct: procedures build an XML change payload and call
`SP_AddAdminChanges` when a workflow is mapped to the page
(`SP_AddNewLeaveTypeMaster.sql:95-545`). The seam is the `TModulePages`
(`ModulePageName`) ↔ `TWorkflowManagement.MappedPages` lookup; if no workflow is
mapped, the edit applies directly (the `Else` branch, `:547`).

## 4. Per-tenant feature flags

`TEmployerDetails` carries ~50 boolean/threshold flags (e.g.
`IsAutomaticConfirmation`, `IsReviewFrequencyEnabled`, `IsPMSReviewerEnabled`,
`ConfirmationDueDays`) that toggle behaviour per tenant without code changes
(`TEmployerDetails.sql:61-94`). New optional behaviour is typically introduced as
a new flag column here.

## 5. Lookup / configuration tables

`TLOOKUP` (and module-specific `TLOOKUP`/`TTSLOOKUP`/`TBGVStatusLOOKUP`) hold
enumerable, editable code lists; `TDATA_GRID_CONFIG` configures grid/report
columns; `TLevelWiseExpenseDetails`/`TExpense_Limit` configure expense policy.
These let admins extend value sets without DDL.

## 6. User-defined table types (UDT)

The `UDT/` folders define table-valued parameter types used to pass row sets into
procedures (bulk operations). Changing a bulk contract means versioning the UDT.
