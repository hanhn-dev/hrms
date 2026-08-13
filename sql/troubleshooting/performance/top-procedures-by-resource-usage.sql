-- =============================================================================
-- top-procedures-by-resource-usage.sql
--
-- Purpose:  Ranks stored procedures by resource consumption to find the
--           actual offender behind a vague "something is slow" report,
--           when nobody can name a specific feature or proc.
--
-- When to use: a report of general slowness with no useful clue about
--           which feature/screen/proc is responsible.
--
-- Inputs:   @TopN         - how many procedures to return (default 25).
--           @LookbackDays - Query Store section only: how far back to
--                           aggregate (default 7).
--
-- Notes:    - Read-only. Requires VIEW SERVER STATE.
--           - Section 1 (plan cache) reflects only activity since the plan
--             was cached - a restart/recompile/eviction resets it. Good
--             for "what's expensive right now."
--           - Section 2 (Query Store) persists across restarts and is
--             better for "what's been expensive lately" - but only returns
--             rows if Query Store is enabled (see check-query-store-status.sql).
--           - Sort by TotalCpuMs to find aggregate load contributors, or by
--             AvgDurationMs to find individually slow calls even if rare.
-- =============================================================================

DECLARE @TopN         INT = 25;   -- <<< how many rows to return
DECLARE @LookbackDays INT = 7;    -- <<< Query Store section only

-- ---------------------------------------------------------------------------
-- Section 1: Plan cache (sys.dm_exec_procedure_stats) - since last restart/recompile
-- ---------------------------------------------------------------------------
SELECT TOP (@TopN)
    OBJECT_SCHEMA_NAME(ps.object_id, ps.database_id)   AS SchemaName,
    OBJECT_NAME(ps.object_id, ps.database_id)          AS ProcedureName,
    ps.execution_count,
    ps.total_worker_time / 1000.0                      AS TotalCpuMs,
    (ps.total_worker_time / 1000.0)
        / NULLIF(ps.execution_count, 0)                AS AvgCpuMs,
    ps.total_elapsed_time / 1000.0                      AS TotalDurationMs,
    (ps.total_elapsed_time / 1000.0)
        / NULLIF(ps.execution_count, 0)                AS AvgDurationMs,
    ps.total_logical_reads,
    ps.total_logical_reads
        / NULLIF(ps.execution_count, 0)                AS AvgLogicalReads,
    ps.last_execution_time,
    ps.cached_time
FROM sys.dm_exec_procedure_stats ps
WHERE ps.database_id = DB_ID()
ORDER BY ps.total_worker_time DESC;

-- ---------------------------------------------------------------------------
-- Section 2: Query Store - persists across restarts (requires QS enabled)
-- ---------------------------------------------------------------------------
SELECT TOP (@TopN)
    OBJECT_SCHEMA_NAME(q.object_id)                    AS SchemaName,
    OBJECT_NAME(q.object_id)                           AS ProcedureName,
    q.query_id,
    SUM(rs.count_executions)                           AS TotalExecutions,
    SUM(rs.avg_cpu_time * rs.count_executions) / 1000.0 AS TotalCpuMs,
    AVG(rs.avg_cpu_time) / 1000.0                       AS AvgCpuMs,
    AVG(rs.avg_duration) / 1000.0                       AS AvgDurationMs,
    AVG(rs.avg_logical_io_reads)                        AS AvgLogicalReads,
    MAX(rsi.end_time)                                   AS LastIntervalEnd
FROM sys.query_store_query q
JOIN sys.query_store_plan p
    ON p.query_id = q.query_id
JOIN sys.query_store_runtime_stats rs
    ON rs.plan_id = p.plan_id
JOIN sys.query_store_runtime_stats_interval rsi
    ON rsi.runtime_stats_interval_id = rs.runtime_stats_interval_id
WHERE q.object_id <> 0
  AND rsi.start_time >= DATEADD(DAY, -@LookbackDays, SYSUTCDATETIME())
GROUP BY q.object_id, q.query_id
ORDER BY TotalCpuMs DESC;
