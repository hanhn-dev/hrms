# Workflow Troubleshooting

Diagnose pending approval queues and force-approve stuck requests by calling
the real approval stored procedures (never raw status `UPDATE`s).

Grounded in `HRMS-DATABASE/HRMS/STOREPROCEDURE/` and `TABLES/` in the
`TDG HRMS DB` repo. Workflow **definitions** (Admin > Workflow Management)
are seeded separately under `sql/seeding/workflow/` — see
`setup-test-workflow.sql`, `list-modules-and-pages.sql`, and
`pagetitle-reference.md` there.

## How approval works

```
Admin defines workflow
  TWorkflowManagement  (header: MappedPages → TModulePages, levels, employer)
  TWorkflowDetails      (per-level: WorkflowRole, ManagerId for role-based)

Request created (Leave / Resignation / My Details / Admin master / …)
  Resolve template → insert TRequestWorkflows rows (ApproveStatus = 'P')
  Domain header stays Pending / IsApproved NULL / ActionStatus = 'Pending'

Approver acts
  Call the domain approve SP (see table below)
  Current queue row → ApproveStatus = 'C', IsApprove = 1
  More levels? USP_WorkFlow_Routing_Levels inserts next-level 'P' rows
  Final level? Domain apply (balances, employee fields, master DML, emails)
```

### `TRequestWorkflows.ApproveStatus`

| Code | Meaning |
| --- | --- |
| `P` | Pending (in someone's queue) |
| `C` | Completed / approved at that step |
| `R` | Rejected |
| `B` | Pullback / superseded prior approval |

`IsApprove`: `0` while pending or after reject; `1` when that step is approved.

## Which script to use

| Scenario | Script | Approve SP |
| --- | --- | --- |
| Find My Details `ChangeRequestId` + eligible approvers | `find-mydetails-change-requests.sql` | (read-only) |
| Inspect any pending request | `diagnose-pending-request.sql` | (read-only) |
| Approve SP returns generic Transaction Fail | `diagnose-mydetails-approve-failure.sql` | (read-only probes; surfaces real ERROR_MESSAGE) |
| Approved but Past History empty / wrong section | `diagnose-mydetails-history-after-approve.sql` | (read-only) |
| Education approve applied live row but no Past History | `backfill-education-history-after-approve.sql` | WRITE `TEducationHistoryDetails` |
| Leave, WFH, AR, OH, CompOff, Resignation, Recruitment, PMS, most ESS | `approve-cm-workflow-request.sql` | `SP_CM_ApproveWorkFlowRequest` |
| My Details field change requests | `approve-mydetails-change-request.sql` | `Sp_ApproveRejectMyDetailsReview` |
| Admin master-data change requests | `approve-admin-changes-request.sql` | `SP_CM_ApproveAdminChangesRequest` |

**Always run diagnose first.** It prints pending `ManagerId` values (who must
act as approver for CM/Admin) and which approve script to run next.

### My Details footgun

`Sp_ApproveRejectMyDetailsReview.@EmployeeId` is **misnamed** — callers pass
the `ChangeRequestId`, not the employee's id. The approve-mydetails script
uses `@ChangeRequestId` and maps it correctly. Queue `RequestType` is usually
`EmploymentTypeChange` even when the change is not employment-type specific.

### Why not `UPDATE … ApproveStatus = 'C'`

Final approval runs large domain side effects: leave balance ledger,
attendance register, employee field apply from
`TMyDetailsChangeRequestDetails`, admin master DML, notification counts,
emails. Skipping the SP leaves data inconsistent and next approval levels
unrouted.

## Safety

- Approve scripts are **WRITE** via stored procedure. Prefer a lower
  environment first; on PROD confirm the pending rows from diagnose.
- CM approve defaults `@SkipEmailNotification = 1` for troubleshooting.
- Multi-level workflows: one CM EXEC advances **one** level. Re-run diagnose
  / approve for each remaining `'P'` level — scripts do not auto-loop.
- Some request types need extra CM params (e.g. `@OverTimeDuration` for OT);
  those are documented as commented extras in `approve-cm-workflow-request.sql`.
