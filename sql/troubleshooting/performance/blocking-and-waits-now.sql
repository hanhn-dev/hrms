-- =============================================================================
-- blocking-and-waits-now.sql
--
-- Purpose:  Live snapshot of every currently executing request - what it's
--           waiting on, whether it's being blocked, and its SQL text/plan.
--           This is the first thing to run when "the app feels slow right
--           now" with no other detail, since it shows what's actually
--           happening on the instance at this moment.
--
-- When to use: whole-app/server slowness reported as currently happening.
--           Re-run a few times a minute apart - a single snapshot can miss
--           a short-lived blocker.
--
-- Inputs:   @DatabaseNameFilter - optional; set to a specific database name
--                                 to narrow to one tenant DB, or leave NULL
--                                 for all databases on the instance.
--
-- Notes:    - Read-only. Requires VIEW SERVER STATE.
--           - blocking_session_id <> 0 means that session IS being blocked
--             by the session id given. Trace the chain back to find the
--             head blocker (the session with blocking_session_id = 0 that
--             everyone else is ultimately waiting on).
--           - wait_type/wait_resource explain WHY a session is slow right
--             now (LCK_* = blocking, PAGEIOLATCH_* = disk IO pressure,
--             CXPACKET/CXCONSUMER = parallelism, RESOURCE_SEMAPHORE =
--             memory grant queue, ASYNC_NETWORK_IO = client not draining
--             results fast enough).
-- =============================================================================

DECLARE @DatabaseNameFilter SYSNAME = NULL;  -- <<< set to narrow to one DB, or leave NULL

SELECT
    r.session_id,
    r.blocking_session_id,
    r.status,
    r.command,
    r.wait_type,
    r.wait_time                        AS WaitTimeMs,
    r.wait_resource,
    r.cpu_time                         AS CpuTimeMs,
    r.total_elapsed_time               AS TotalElapsedMs,
    r.logical_reads,
    r.reads,
    r.writes,
    r.granted_query_memory,
    DB_NAME(r.database_id)             AS DatabaseName,
    s.login_name,
    s.host_name,
    s.program_name,
    r.start_time,
    t.text                             AS SqlText,
    qp.query_plan
FROM sys.dm_exec_requests r
JOIN sys.dm_exec_sessions s
    ON s.session_id = r.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
OUTER APPLY sys.dm_exec_query_plan(r.plan_handle) qp
WHERE r.session_id <> @@SPID
  AND (@DatabaseNameFilter IS NULL OR DB_NAME(r.database_id) = @DatabaseNameFilter)
ORDER BY r.total_elapsed_time DESC;
