# Testing Strategy

What testing exists for this database, from the source. The honest summary: **no
automated test suite is present in the repository.**

## Observed

- **No unit/integration tests** — no tSQLt classes, no test project, no fixtures
  found under any module.
- **No CI configuration** — nothing wires tests into a pipeline.
- **Implicit verification** comes from:
  - Idempotent object scripts that fail loudly on apply if malformed.
  - Defensive validation *inside* procedures (returning `ErrorCode`/`ErrorMsg`),
    which is application-facing rather than a test.
  - `*_bkp<date>` snapshots taken before risky changes (manual safety net).
- **Environments as test gates** — `Training_Dev`, `TLOOKUP_CL_UAT`, and the
  pervasive `_DP` ("data prep"/dev) table variants imply manual UAT/dev
  validation before production.

## Known gaps / risks (untested by construction)

- Tenant-isolation correctness (missing `Employerid` filters) — high-impact,
  unguarded by tests.
- `LeaveStatus` encoding consistency — no CHECK constraint, no test.
- Balance-ledger reconciliation (`TLeaveBalanceLedger` opening/closing chain).
- Approval-engine level progression across the 21 `RequestType`s.
- Cross-database synonym resolution per environment.

## Recommended verification when changing logic

Since there is no harness, define a concrete check per change:
- Run the affected procedure against a dev/UAT tenant and assert the result set
  / table state for a known input.
- For approval changes, verify `TRequestWorkflows` rows transition as expected.
- For balance changes, verify the ledger chain reconciles.

<!-- No automated tests exist in-repo; this page documents that gap rather than a
suite. See assumptions/open-questions.md. -->
