---
sources:
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AddNewLeaveTypeMaster.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/ELMAH_LogError.sql
confidence: medium
last-analyzed: 2026-06-26
---

# API Standards (stored-procedure contract)

The "API" is the stored-procedure surface (no HTTP layer in this repo). These
are the observed conventions a new procedure should follow to match the codebase.

## Procedure header boilerplate

Every SP script starts with:

```sql
USE [HRMS_PROD]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[SP_Name] ( @Param TYPE, ... ) AS
BEGIN
  SET NOCOUNT ON   -- common in transactional procs
  ...
END
```

A header comment block documents `Author` / `Create date` / `Description` and a
**change log** of `Modified by | Date | Reason` lines that cite the Azure DevOps
`PBI#<n>` (`SP_AddNewLeaveTypeMaster.sql:61-70`,
`SP_ApproveWorkFlowRequest.sql:17-27`). Keep adding to this log; don't rewrite it.

## Parameters

- **Tenant scope is explicit**: pass `@Employerid INT`. The DB does not infer
  the current tenant.
- **Actor is explicit**: pass `@CreatedBy`/`@UpdatedBy INT` (the app supplies the
  acting user id; the DB does not look it up).
- **Optional params get defaults**: `@confirmationStatus VARCHAR(10) = NULL`,
  `@Noofdays DECIMAL = NULL` (`SP_ApproveWorkFlowRequest.sql:35-38`).
- **Discriminators are strings**: `@RequestType VARCHAR(50)` selects behaviour.

## Return / result conventions

- Procedures **return result sets via `SELECT`**, often multiple sets, rather
  than scalar return codes.
- **Validation errors** are returned as a result set with `ErrorCode` + an error
  message column, then `RETURN` to abort
  (`SP_AddNewLeaveTypeMaster.sql:89-92`). Do not raise unhandled errors for
  business-rule failures; surface them as data.
- **Idempotency**: state-changing engine procs guard on current state
  (`ApproveStatus='P' AND IsApprove=0`) so a repeated call is a no-op.

## Dynamic SQL

- `sp_executesql` with typed parameters and `OUTPUT` is used for parameterized
  validation (`SP_AddNewLeaveTypeMaster.sql:85`). Prefer it over string
  concatenation of values to avoid injection; existing code mixes both.

## Errors & logging

- Application-tier errors are logged to `ELMAH_Error` via `dbo.ELMAH_LogError`.
- Procedures should be safe to re-run (object scripts use `DROP ... IF EXISTS`
  for synonyms; tables/procs are `CREATE`).

## Anti-patterns present in the codebase (avoid in new code)

- Inconsistent status encodings (`LeaveStatus` words vs single chars).
- Verbose hand-built XML payloads repeated per field (the admin-change builders)
  — consider a set-based approach for new work.
- Unscoped queries missing `Employerid` — a tenant-isolation defect.
