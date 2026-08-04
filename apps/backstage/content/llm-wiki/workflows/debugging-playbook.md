# Debugging Playbook

Common failure modes and where to look first. Oriented to the recurring shapes of
this database.

## "An approval isn't progressing / a request is stuck"

1. Inspect `TRequestWorkflows` for the artifact:
   `WHERE RequestTransid = <id> AND RequestType = '<type>'`. Check each level's
   `ApprovalLevel`, `ManagerId`, `ApproveStatus`, `IsApprove`.
2. A stuck request usually has a pending row (`ApproveStatus='P'`) whose
   `ManagerId` is wrong/inactive, or no routing rows were created at all (workflow
   not mapped for the page/tenant in `TWorkflowManagement`).
3. Check short-circuit flags (`SkipWorkFlow`, `IsEnableAutoApproved`,
   `IsAutoApprove`) — an unexpected auto-approve or skip.
4. See `../domain/approval-workflow.md` for the dispatch logic.

## "Leave balance looks wrong"

1. Read the `TLeaveBalanceLedger` rows for `(Employeeid, LeaveCode, Employerid)`
   in `Createdate` order; verify `closingbalance` chains into the next
   `openingbalance`.
2. Check the leave type rules (`TLeaveTypeMaster`) — encashment, carry-forward,
   truncation, `CurrentYearNegativeBalanceAllowed`.
3. Suspect the year-end jobs (`SP_AdminLM_TruncateLeave`, `SP_AddLeavesRollOver`)
   if the discontinuity is at a month/year boundary.

## "Status filter returns nothing / wrong rows"

- `TLeaveRequest.LeaveStatus` is written with **both** full words and single
  chars across procedures. Query for both (`IN ('Approved','A')` style) or check
  which procedure wrote the row. See `../glossary/terminology.md`.

## "Data leaks across tenants / missing rows"

- Look for a query missing the `Employerid` predicate. Tenant isolation is
  procedure-enforced, not engine-enforced (`../architecture/tenancy-model.md`).

## "Cross-module query fails (Invalid object name)"

- A synonym's target database is missing/renamed, or casing differs across
  environments. Check `SYNONYMS/` and `../reference/module-dependency-graph.md`.

## "Where did this error come from?"

- Query `ELMAH_Error` (logged by `ELMAH_LogError`) filtered by `Application`,
  `TimeUtc`, `Message`. Note `ELMAH_LogError` deliberately drops the noisy
  `/HRM/Login.aspx does not exist` message.

## Reading the source

- Files are **UTF-16**; use the harness tools (raw `grep` misses content).
- Many objects have `_bkp<date>`/`_History`/`_V2` siblings — confirm you're
  reading the live unsuffixed object.
