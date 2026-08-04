---
sources:
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AddNewLeaveTypeMaster.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/ELMAH_LogError.sql
confidence: medium
last-analyzed: 2026-06-26
---

# Service APIs (stored-procedure surface)

The "API" of this system is its **stored procedures**: the application tier calls
them by name with parameters. There is no HTTP/REST layer in this repository.
This page catalogs the surface conventions and documents the highest-value
procedures; the full set is ~5,000+ SPs across modules (`module-catalog.md`).

## Surface conventions

- **Naming** (see `../conventions/api-standards.md`): `SP_`, `HRMS_SP_`, `USP_`/
  `usp`, `Sp_<Area>_<Verb>` (e.g. `SP_AdminLM_GetLeaveBal`,
  `Sp_AdminPMS_GetAllSalaryRecPercentageMapping`). Reporting procs use `OV_Rule_*`.
- **Verb in the name**: `Get*`/`Ins*`/`Upd*`/`Del*`/`Add*`/`Save*` signal intent.
- **Result style**: procedures `SELECT` result sets (often multiple) rather than
  returning scalars; error/validation is returned as a result set with
  `ErrorCode`/`ErrorMsg` columns (`SP_AddNewLeaveTypeMaster.sql:89`), and `RETURN`
  is used to short-circuit on validation failure (`:91`).
- **Tenant parameter**: most write procedures take `@Employerid INT`.
- **Audit parameters**: `@CreatedBy`/`@UpdatedBy INT` passed in (the DB does not
  derive the current user; the app tier supplies it).

## Key procedures

### `SP_ApproveWorkFlowRequest` — central approval dispatcher

```yaml
proc: dbo.SP_ApproveWorkFlowRequest
purpose: Approve a pending request of any RequestType and advance the workflow.
params:
  - { name: '@RequestType',      type: VARCHAR(50) }   # discriminator, see event-catalog
  - { name: '@RequestTransId',   type: INT }            # PK of originating artifact
  - { name: '@EmployeeId',       type: INT }            # the approving manager
  - { name: '@comments',         type: VARCHAR(1000) }
  - { name: '@ActualReleavingDate', type: DATETIME, default: NULL }
  - { name: '@Employerid',       type: INT }
  - { name: '@confirmationStatus', type: 'VARCHAR(10)', default: NULL }  # E/Extended/Approved
  - { name: '@Noofdays',         type: DECIMAL, default: NULL }
  - { name: '@AddNoticePeriodLeaves', type: CHAR(1), default: NULL }
behavior: |
  Looks up the pending routing row in TRequestWorkflows
  (ApproveStatus='P' AND IsApprove=0) for this manager/request, marks it
  approved, advances to the next ApprovalLevel, and applies RequestType-specific
  side effects (e.g. leave balance debit, resignation status update).
source: SP_ApproveWorkFlowRequest.sql:28-39, 83-90
```

Companion: `SP_RejectWorkFlowRequest` (reject path, "Reject Leave/WFH/Attendance
Regularization" per the header comment).

### `SP_AddNewLeaveTypeMaster` / `SP_AddNewLeaveType` — create a leave policy

Inserts into `TLeaveTypeMaster` (and `TLeaveBusinessUnit`/`TLeaveLocation`/
`TLeaveGrade`/`TLeaveEmployeeStatus`/`TLeaveClubWith` scoping tables). If a
workflow is mapped to page `CreateLeaveType`, the change is routed for approval
via `SP_AddAdminChanges` instead of applied directly
(`SP_AddNewLeaveTypeMaster.sql:95-545`). Takes ~45 parameters mirroring the
`TLeaveTypeMaster` columns.

### `SP_AdminLM_*` — leave administration

Family of admin procedures: `SP_AdminLM_GetAllLeaveTypeDet`,
`SP_AdminLM_GetLeaveBal`, `SP_AdminLM_GetLeaveRuleConfig`,
`SP_AdminLM_TruncateLeave` (+ `_EmailAlert`), `SP_AddLeavesRollOver`.

### `ELMAH_LogError` — error sink

```yaml
proc: dbo.ELMAH_LogError
params: ['@ErrorId UNIQUEIDENTIFIER','@Application','@Host','@Type','@Source',
         '@Message','@User','@AllXml NTEXT','@StatusCode INT','@TimeUtc DATETIME']
behavior: INSERT INTO ELMAH_Error; filters out the noisy '/HRM/Login.aspx does not exist' message.
source: ELMAH_LogError.sql:10-39
```

> This catalog documents representative high-value procedures. The full
> ~5,000-procedure surface is not enumerated here; use the SP-name conventions
> above plus `Glob`/`Grep` over the `STOREPROCEDURE/` folders to locate a
> specific operation. Uncovered breadth is logged in
> `../assumptions/open-questions.md`.
