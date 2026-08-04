# Terminology

The verbs, states, and jargon used in code and column names across the HRMS
database. One short paragraph each. Status-code values are enumerated where the
source uses a fixed set.

- **Approve / Reject / Pullback / Cancel** — the four request-disposition verbs
  driven by `SP_ApproveWorkFlowRequest` / `SP_RejectWorkFlowRequest`. *Pullback*
  means the requester withdraws an already-submitted request; *Cancel* means
  cancelling an already-approved item (e.g. an approved leave). Both appear as
  distinct `RequestType`s (`LeavePullback`, `LeaveCancellation`).

- **Request Type** — the discriminator that tells the central approval engine
  which artifact a routing row belongs to. `TRequestWorkflows.RequestType`
  (`VARCHAR(50)`). Observed values in `SP_ApproveWorkFlowRequest.sql`:
  `LeaveRequest`, `LeaveCancellation`, `LeavePullback`, `OptionalHolidayRequest`,
  `OptionalHolidayCancellation`, `CompOffCreditRequest`, `WorkFromHome`,
  `WFHCancellation`, `WorkFromHomePullback`, `AttendanceRegularize`,
  `ARCancellation`, `ResignationDetails`, `ResignationActivity`,
  `ResignationPullback`, `TerminationActivity`, `BusinessCard`,
  `SelfAssessment`, `ConfirmationAssessment`, `RecruitmentManagement`,
  `InterviewFeedback`, `InitiateHiring` (`SP_ApproveWorkFlowRequest.sql:114-1342`).
  This is the set referenced by that one procedure and is likely not exhaustive
  across the whole engine — see `../reference/event-catalog.md`.

- **Approve Status** — single-character routing-row state on
  `TRequestWorkflows.ApproveStatus CHAR(1)`: `'P'` = pending (the engine selects
  pending rows with `ApproveStatus = 'P' AND IsApprove = 0`)
  (`SP_ApproveWorkFlowRequest.sql:89`). Approved rows set `IsApprove = 1`.

- **Leave Status** — state on `TLeaveRequest.LeaveStatus VARCHAR(15)`. The
  codebase is **inconsistent**: some procedures use full words
  (`'Pending'`, `'Approved'`, `'Cancelled'`/`'Canceled'`, `'Pullback'`) and
  others use single chars (`'P'`, `'C'`, `'B'`) for the same column
  (compare `SP_ApproveLeave.sql:48` with `SP_AdminLM_TruncateLeave.sql:147`).
  Flagged in `../assumptions/open-questions.md`.

- **Routing Level / Approval Level** — the position of an approver in a
  multi-level workflow. `TWorkflowManagement.RoutingLevels` (count) and
  `TRequestWorkflows.ApprovalLevel` (this row's level). The engine walks levels
  in order, escalating manager-by-manager.

- **Auto-Approve / Skip Workflow / Partial Workflow** — workflow short-circuits:
  `TWorkflowManagement.IsEnableAutoApproved`, `SkipWorkFlow`, `IsWorkflowPartial`
  and `TRequestWorkflows.IsAutoApprove` (`TWorkflowManagement.sql:16-19`).

- **Admin Change / Setup & Config Change Tracker** — configuration edits to
  master data are themselves routed for approval. `SP_AddAdminChanges` records a
  pending config change as an XML payload (`@ApprovalDetails`) against
  `TAdminChangesApprovals` / `TAdminChangesApprovalDetails`; e.g.
  `SP_AddNewLeaveTypeMaster` routes a `CreateLeaveType` change when a workflow is
  mapped to that page (`SP_AddNewLeaveTypeMaster.sql:95-545`).

- **Comp-Off** — compensatory time off earned for working on an off day, then
  spent as leave. Flagged on a leave type via
  `TLeaveTypeMaster.IsLeaveTypeCompOff` with credit/expiry rules
  (`TLeaveTypeMaster.sql:43,59-62`); requested via `CompOffCreditRequest`.

- **Encashment** — converting accrued leave to cash. `IsEncashable`,
  `EncashmentFrequency`, `EncashmentLimit`, `MininumBalanceForEncashment`
  (`TLeaveTypeMaster.sql:27-30`).

- **Carry-Forward / Truncation / Re-Initialization** — year-boundary leave
  handling: `CarryForwardDaysLimit`, `LeaveTruncation`/`TruncationMonth`,
  `ReInitialiseBalanceEveryYear`/`ReInitializationMonth`
  (`TLeaveTypeMaster.sql:31-41`). Implemented by `SP_AdminLM_TruncateLeave` and
  `SP_AddLeavesRollOver`.

- **Confirmation (CMS)** — the probation-to-confirmed transition.
  `IsAutomaticConfirmation`, `ConfirmationDueDays`,
  `IsAutomaticConfirmationLetter` on `TEmployerDetails`
  (`TEmployerDetails.sql:75,83,86`); request types `SelfAssessment`,
  `ConfirmationAssessment`.

- **Attendance Regularization (AR)** — correcting a missed/incorrect punch via
  an approved request (`AttendanceRegularize` / `ARCancellation` request types,
  `TAttendanceRegularization`).

- **Transaction Source** — provenance tag on ledger/attendance rows
  (`TLeaveBalanceLedger.TransactionSource`,
  `TAttendanceTransactionOtherSource`) distinguishing biometric, manual, geo,
  and integration-fed records.

- **Soft Delete** — rows are rarely hard-deleted. Conventions:
  `IsActive CHAR(1)` (`'Y'`/`'N'`), `IsDelete`/`IsDeleted`/`isdeleted BIT`,
  `DeactivationDate`. Historical snapshots go to `*_History` tables and dated
  `*_bkp<date>` backups.
