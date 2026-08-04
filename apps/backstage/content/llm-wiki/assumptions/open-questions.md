# Open Questions

Everything that could not be determined from the SQL source. These are gaps, not
guesses. Resolve by inspecting runtime, the application tier, or asking the team.

## Platform & deployment
- Exact SQL Server version/edition and collation. (`TIME(7)` implies 2008+;
  not pinned anywhere.)
- How the seven databases are deployed/versioned together; no CI/CD, IaC, or
  deploy scripts in the repo. Are they on one instance? Cross-DB synonyms imply
  same instance, but not confirmed.
- Backup/HA/replication topology. See `architecture/deployment-topology.md`.

## Application tier
- The calling application's framework and version. Evidence points to ASP.NET
  (`/HRM/Login.aspx`, ELMAH), but the app is not in this repo.
- Authentication mechanism: password hashing algorithm and session issuance are
  in the app tier, not the DB. The DB stores only policy + invalid-login audit.

## Encryption
- The encryption provider/key management for `*_Encrypted VARBINARY(MAX)` columns
  (Always Encrypted? app-side AES? a key in a config?). The DDL only shows the
  column type. Plaintext mirrors (`FName`, `DoB`, `TaxId`, ...) coexist with the
  encrypted columns — which is authoritative at runtime, and is the plaintext a
  migration artifact or live? Unknown.

## Data model
- `TLeaveBalanceLedger` and `TRequestWorkflows` scripts declare IDENTITY columns
  but **no PRIMARY KEY / clustered index**. Confirm runtime clustered index;
  the scripts may be partial exports.
- Full FK graph: only a handful of FKs are declared in the table scripts
  (e.g. `TEmployee` → `TMaritalStatus`/`TPersonalTitle`). Most relationships
  appear to be by-convention (matching `*Id` columns) rather than enforced FKs.
  Confirm whether FKs exist at runtime or relationships are app-enforced.

## Status-code inconsistency (defect candidate)
- `TLeaveRequest.LeaveStatus` is used with **both** full words
  (`'Pending'`/`'Approved'`/`'Cancelled'`/`'Canceled'`/`'Pullback'`) and single
  chars (`'P'`/`'C'`/`'B'`) across different procedures
  (`SP_ApproveLeave.sql:48` vs `SP_AdminLM_TruncateLeave.sql:147`). Also note
  `'Cancelled'` vs `'Canceled'` spelling drift. Which is canonical?

## Enumerations not fully extracted
- The complete `RequestType` universe beyond `SP_ApproveWorkFlowRequest`
  (21 values found there; other procs may add more).
- `THrmsModules` row set (the actual in-app module list) — it is a data table,
  rows not in DDL.
- `TLOOKUP` / `TBGVStatusLOOKUP` / `TTSLOOKUP` full value sets (data, not DDL).
  For `TBGVStatusLOOKUP`, the subset of status names referenced in SP logic
  (`Documents Request`, `Initiated`, `Partially Initiated`, `Documents Received`,
  `Completed`, `Stop Check`, `Cancel`) is documented in
  `../domain/background-verification.md`; the full per-tenant `Lookup_ID` →
  `Lookup_Text` mapping (including the `402`/`500`/`502` "completed result"
  codes) is still not in this repo.
- Per-module `TEMAIL_NOTIFICATION` payload schema.

## Breadth not covered (size)
- This KB extracts the core backbone and representative procedures. The full
  ~5,000+ stored procedures and ~1,100 HRMS tables were **not** each read.
  Specifically not extracted in depth: payroll/salary calculation procedures,
  PMS/CMS scoring logic, recruitment (RRS) flow internals, TIMEPORT integration
  partner protocols, full TNE expense-category rules, RAS lock-matrix algorithm,
  Survey scoring. Use `Glob`/`Grep` over the relevant `STOREPROCEDURE/` folder
  when a specific procedure's logic is needed.

## Ownership / process
- Team ownership, on-call, SLAs, release cadence, branching policy. Only the git
  history (Azure DevOps PR merges, PBI references) is available — see
  `identity/ownership.md` and `conventions/branching-strategy.md`.
