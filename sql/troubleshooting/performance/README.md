# Performance / Slowness Troubleshooting

Scripts for the "it's slow" class of report — whether that's the whole
server/app feeling sluggish right now, or a specific feature/stored
procedure someone flagged with no further detail.

**Requires `VIEW SERVER STATE`** on the target instance for every script
here except `procedure-runtime-stats.sql`'s Query Store section — that
permission is what lets an account read the DMVs these scripts query
(`sys.dm_exec_requests`, `sys.dm_exec_procedure_stats`, etc.). Without it,
queries return zero rows or fail outright.

**Run against the real PROD instance**, not a restored/dev copy — DMV-based
scripts only reflect activity on the instance you're connected to, and
`sys.dm_exec_procedure_stats` resets on restart/recompile, so a dev copy
with no live traffic won't show anything useful.

## Scenarios

1. **Whole app/server feels slow right now, no other detail** — check for
   active blocking and see what current sessions are actually waiting on.
   → `blocking-and-waits-now.sql`

2. **"Something" is slow, nobody can say what** — rank stored procedures by
   CPU/duration/reads to find the actual offenders, from both the plan
   cache (since last restart/recompile) and Query Store (persists across
   restarts, if enabled).
   → `top-procedures-by-resource-usage.sql`

3. **A specific feature or stored procedure was reported slow** — pull that
   proc's runtime stats and, if Query Store is enabled, its day-by-day
   trend (to tell "always been this way" from "got slower on date X") plus
   a min/max/avg spread that flags likely parameter sniffing.
   → `procedure-runtime-stats.sql`

4. **Need the actual execution plan for a slow proc** — pull its currently
   cached plan XML to open in SSMS or feed into the `review-plan` skill.
   → `procedure-current-plan.sql`

Before using the Query Store sections of #2-#3, confirm it's actually
enabled on the target database:
→ `check-query-store-status.sql`

## Decision tree: from symptom to fix

1. **Run `blocking-and-waits-now.sql` first**, 2-3 times a minute apart.
   - Rows chain via `blocking_session_id` → trace back to the head blocker
     (`blocking_session_id = 0`); its `SqlText` names the real culprit.
     A head blocker `sleeping` with no active wait = an app connection that
     opened a transaction and never closed it - an app-code bug, not a query
     problem.
   - No blocking, just slow waits → read `wait_type`: `LCK_M_*` is locking,
     `PAGEIOLATCH_*`/`IO_COMPLETION` is storage latency (escalate to
     infra/DBA), `RESOURCE_SEMAPHORE` is a memory-grant queue (go to step 2),
     `SOS_SCHEDULER_YIELD` is CPU saturation, `ASYNC_NETWORK_IO` is the
     client not draining results (app-side, not DB-side).
   - Nothing shows up live → doesn't mean nothing's wrong, just that it
     isn't reproducing right now. Go to step 2.

2. **Run `top-procedures-by-resource-usage.sql`.** High `execution_count`
   with small `AvgDurationMs` but large `TotalCpuMs` is an N+1/chatty-call
   pattern (app issue, not tunable in SQL). A standout `AvgDurationMs` on a
   low-execution-count proc is your target - go to step 3.

3. **Run `procedure-runtime-stats.sql` for that procedure.** A statement
   where `MaxDurationMs` is far above `AvgDurationMs` is a parameter-
   sniffing signature. In the Query Store trend, a sudden jump on a specific
   date is a regression (correlate with a deploy/schema change/data growth);
   consistently bad across all days is a standing design issue - go to step 4
   either way.

4. **Run `procedure-current-plan.sql`** and open the XML in SSMS. Look for
   scans where a seek is expected, big estimate-vs-actual row mismatches,
   repeated Key Lookups (missing covering index), and Sort/Hash spills to
   tempdb. Hand the plan to the `review-plan` skill, or the whole proc to
   `optimize-sql`.

5. **Fix what step 4 actually found** - missing index (`generate-indexes`
   skill, don't blindly apply every DMV suggestion), stale statistics
   (`UPDATE STATISTICS`), parameter sniffing (discuss `RECOMPILE` vs
   `OPTIMIZE FOR UNKNOWN` vs splitting by parameter shape - don't recompile
   a high-frequency proc without weighing the cost), or an app-code fix for
   open transactions / chatty calls.

6. **Re-verify** - re-run `procedure-runtime-stats.sql` and compare the
   Query Store trend before/after, and re-run `blocking-and-waits-now.sql`
   under peak load to confirm the chain is gone.

## Notes

- All scripts here are read-only (`SELECT` only).
- Cache-based stats (`sys.dm_exec_procedure_stats`) reflect only activity
  since the plan was cached — a restart, recompile, or plan eviction resets
  the counters. Query Store, where enabled, is what actually answers
  "when did this get slow."
- If Query Store isn't enabled on PROD, `check-query-store-status.sql` will
  say so — enabling it is a configuration change with its own tradeoffs
  (storage, overhead) and isn't something these scripts do automatically.
