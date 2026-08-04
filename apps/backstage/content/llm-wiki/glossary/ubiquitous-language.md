# Ubiquitous Language

Terms that mean the same thing in code, in column names, and in business
conversation — plus the overloaded terms where they diverge. Use this to keep
new code and docs aligned with the existing vocabulary.

## Terms identical in code and business

| Business term | Code form | Notes |
|---|---|---|
| Employer | `Employerid`, `TEmployerDetails` | Always means *tenant organization*, not a person. |
| Employee | `EmployeeId`, `TEmployee` | The worker. |
| Leave Code | `LeaveCode CHAR(4)` | The business-visible 4-char code identifying a leave type. |
| Workflow | `TWorkflowManagement`, `WorkflowId` | A named multi-level approval definition. |
| Manager | `ManagerId` | The approver for a routing level (`TRequestWorkflows.ManagerId`). |
| Business Unit | `TBusinessUnit`, `Employerid`-scoped | Org slice for policy/reporting. |
| Comp-Off | `IsLeaveTypeCompOff`, `CompOffCreditRequest` | Compensatory off. |

## Overloaded / ambiguous terms — read carefully

- **"Status"** is overloaded. `LeaveStatus` (`TLeaveRequest`) uses *both* full
  words and single chars in different procedures (see `terminology.md`).
  `ApproveStatus` (`TRequestWorkflows`) is strictly single-char `'P'`. Do not
  assume one encoding.

- **"Request" / "Transaction" / "Trans"** all appear as primary-key prefixes
  (`TransId`, `RequestTransid`, `LeaveTransactionId`). `RequestTransid` on
  `TRequestWorkflows` is a *foreign* reference to the originating artifact's PK
  (e.g. `TLeaveRequest.TransId`), keyed by `RequestType`. There is no single FK;
  the link is `(RequestType, RequestTransid)`.

- **"Pullback" vs "Cancellation"** are distinct, not synonyms. Pullback =
  withdraw a pending request; Cancellation = reverse an approved item. Each has
  its own `RequestType`.

- **"Employer" vs "Employerid 0 / Root / Parent"** — `Employerid = 0` is used as
  a default on `TEmployerDetails.Employerid` (`TEmployerDetails.sql:44`).
  Tenant hierarchy uses `ParentEmployerid` and `RootEmployerId`; a sequence can
  be shared with the root org via `IsSequenceWithRootOrganization`.

- **"Module"** is overloaded: `THrmsModules` is the *in-app feature module*
  registry (FK'd by workflows), while *module* also informally names the seven
  physically separate databases (HRMS, TIMEPORT, TRAINING, ...). See
  `../architecture/module-catalog.md`.

- **"Claim"** — `TCLAIM`/`TCLAIM_ASSIGNMENT` recur in Training, RAS, CRB, and TNE
  but are independent per-database tables (often surfaced into HRMS via
  synonyms), not one shared table.
