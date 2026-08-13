-- =============================================================================
-- procedure-runtime-stats.sql
--
-- Purpose:  Deep-dive on ONE stored procedure (or a LIKE pattern matching a
--           small family of procs) when a specific feature was reported
--           slow. Shows current cache stats, a min/max/avg spread that
--           flags likely parameter sniffing, and - if Query Store is
--           enabled - a day-by-day trend to tell "always been this way"
--           from "got slower starting on date X".
--
-- When to use: someone names a specific feature/screen/procedure as slow.
--           Map the feature to its stored procedure name first (see
--           llm-wiki/ or GitNexus for the page -> proc mapping), then run
--           this with that name.
--
-- Inputs:   @ProcedureNamePattern - LIKE pattern, e.g. 'SP_GetEmployeeList%'
--                                   or an exact name.
--
-- Notes:    - Read-only. Section 1/2 require VIEW SERVER STATE; Section 3
--             (Query Store) does not, but requires QS enabled (see
--             check-query-store-status.sql).
--           - Section 2: a large gap between min_elapsed_time and
--             max_elapsed_time for the same statement, with total_worker_time
--             close to zero cost per row, is the classic parameter-sniffing
--             signature - one cached plan that's great for one parameter
--             value and terrible for another.
-- =============================================================================

DECLARE @ProcedureNamePattern NVARCHAR(200) = N'SP_ExampleProcedureName%';  -- <<< set this

-- ---------------------------------------------------------------------------
-- Section 1: Current plan-cache stats for the procedure as a whole
-- ---------------------------------------------------------------------------
SELECT
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
    ps.min_elapsed_time / 1000.0                        AS MinDurationMs,
    ps.max_elapsed_time / 1000.0                        AS MaxDurationMs,
    ps.last_execution_time,
    ps.cached_time
FROM sys.dm_exec_procedure_stats ps
WHERE ps.database_id = DB_ID()
  AND OBJECT_NAME(ps.object_id, ps.database_id) LIKE @ProcedureNamePattern;

-- ---------------------------------------------------------------------------
-- Section 2: Per-statement spread inside the procedure - parameter sniffing check
-- ---------------------------------------------------------------------------
SELECT
    OBJECT_SCHEMA_NAME(qs.object_id, qs.database_id)   AS SchemaName,
    OBJECT_NAME(qs.object_id, qs.database_id)          AS ProcedureName,
    qs.execution_count,
    qs.min_elapsed_time / 1000.0                        AS MinDurationMs,
    qs.max_elapsed_time / 1000.0                        AS MaxDurationMs,
    (qs.total_elapsed_time / 1000.0)
        / NULLIF(qs.execution_count, 0)                AS AvgDurationMs,
    qs.last_execution_time,
    SUBSTRING(
        st.text,
        (qs.statement_start_offset / 2) + 1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset
          END - qs.statement_start_offset) / 2) + 1
    )                                                    AS StatementText
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
WHERE qs.database_id = DB_ID()
  AND OBJECT_NAME(qs.object_id, qs.database_id) LIKE @ProcedureNamePattern
ORDER BY MaxDurationMs DESC;

-- ---------------------------------------------------------------------------
-- Section 3: Query Store day-by-day trend (requires QS enabled)
-- ---------------------------------------------------------------------------
SELECT
    CAST(rsi.start_time AS DATE)   AS StatsDate,
    SUM(rs.count_executions)        AS Executions,
    AVG(rs.avg_duration) / 1000.0   AS AvgDurationMs,
    AVG(rs.avg_cpu_time) / 1000.0   AS AvgCpuMs,
    AVG(rs.avg_logical_io_reads)    AS AvgLogicalReads
FROM sys.query_store_query q
JOIN sys.query_store_plan p
    ON p.query_id = q.query_id
JOIN sys.query_store_runtime_stats rs
    ON rs.plan_id = p.plan_id
JOIN sys.query_store_runtime_stats_interval rsi
    ON rsi.runtime_stats_interval_id = rs.runtime_stats_interval_id
WHERE OBJECT_NAME(q.object_id) LIKE @ProcedureNamePattern
GROUP BY CAST(rsi.start_time AS DATE)
ORDER BY StatsDate DESC;
