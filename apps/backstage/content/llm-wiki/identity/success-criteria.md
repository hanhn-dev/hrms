# Success Criteria

What "working / releasable" means for this database, judged from the source.
There is no automated test suite or CI config in the repo, so most criteria are
implicit and process-based rather than enforced gates.

## Observed / implicit criteria

- **Objects deploy cleanly.** Each `*.sql` is an idempotent object script
  (`DROP ... IF EXISTS` for synonyms; `CREATE PROCEDURE`/`CREATE TABLE`). Success
  = the script applies to the target database without error.
- **Cross-database synonyms resolve.** Because the core depends on six sibling
  databases via synonyms, a release is only correct if all target databases and
  objects exist (see `../reference/module-dependency-graph.md`).
- **Tenant isolation holds.** Procedures must filter by `@Employerid`; a missing
  tenant filter is a correctness/security defect.
- **Approvals route correctly.** A submitted request must produce the right
  `TRequestWorkflows` rows and reach final approval through the configured levels.
- **Balances reconcile.** `TLeaveBalanceLedger` opening/closing balances must be
  internally consistent (append-only ledger).
- **Errors are captured.** Unhandled errors land in `ELMAH_Error` via
  `ELMAH_LogError`; this is the operational health signal.

## Not enforced in-repo (gaps)

- No unit/integration tests (tSQLt or otherwise) found.
- No coverage metric, no lint/static-analysis config, no CI pipeline.
- No defined performance SLO in source (though the heavy covering-index strategy
  on `TRequestWorkflows` shows read-latency is a concern).

See `../quality/testing-strategy.md` and `../assumptions/open-questions.md`.

<!-- TODO: needs input — formal release/acceptance gates are defined outside the repo. -->
