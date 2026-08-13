-- =============================================================================
-- procedure-current-plan.sql
--
-- Purpose:  Pulls the currently cached execution plan XML for a specific
--           stored procedure, to open in SSMS (click the returned
--           query_plan cell) or hand to the review-plan skill.
--
-- When to use: after procedure-runtime-stats.sql confirms a specific
--           procedure is the slow one and you need to see WHY (bad
--           estimate, missing index, scan vs seek, spill to tempdb, etc).
--
-- Inputs:   @ProcedureNamePattern - LIKE pattern, e.g. 'SP_ExampleProc%'
--                                   or an exact name.
--
-- Notes:    - Read-only. Requires VIEW SERVER STATE.
--           - This is the CACHED plan, which may not match a currently
--             in-flight execution. For a plan of a request running right
--             now, use blocking-and-waits-now.sql instead (it joins
--             sys.dm_exec_query_plan off the live request's plan_handle).
--           - If no rows come back, the plan isn't in cache right now
--             (evicted, recompiled since, or never executed since restart).
-- =============================================================================

DECLARE @ProcedureNamePattern NVARCHAR(200) = N'SP_ExampleProcedureName%';  -- <<< set this

SELECT
    OBJECT_SCHEMA_NAME(ps.object_id, ps.database_id)   AS SchemaName,
    OBJECT_NAME(ps.object_id, ps.database_id)          AS ProcedureName,
    ps.plan_handle,
    ps.cached_time,
    ps.last_execution_time,
    ps.execution_count,
    qp.query_plan
FROM sys.dm_exec_procedure_stats ps
CROSS APPLY sys.dm_exec_query_plan(ps.plan_handle) qp
WHERE ps.database_id = DB_ID()
  AND OBJECT_NAME(ps.object_id, ps.database_id) LIKE @ProcedureNamePattern;
