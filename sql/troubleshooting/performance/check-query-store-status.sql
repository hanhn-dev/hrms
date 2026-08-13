-- =============================================================================
-- check-query-store-status.sql
--
-- Purpose:  Reports whether Query Store is enabled on the current database
--           and, if so, its operating mode and storage usage. Query Store
--           is what makes "when did this get slow" answerable without a
--           live repro - it persists per-query/per-plan stats across
--           restarts, unlike sys.dm_exec_procedure_stats which resets on
--           restart/recompile/plan eviction.
--
-- When to use: before running the Query Store sections of
--           top-procedures-by-resource-usage.sql or
--           procedure-runtime-stats.sql, to confirm there's actually data
--           to query.
--
-- Inputs:   None - run in the context of the target database
--           (USE <database>; first, or set it in your connection).
--
-- Notes:    - Read-only. No VIEW SERVER STATE required - these are
--             database-scoped catalog views.
--           - If is_query_store_on = 0 or actual_state_desc = 'OFF',
--             the Query Store sections of the other scripts will return
--             no rows. Enabling Query Store is a configuration decision
--             (storage/overhead tradeoffs) - not something to do without
--             discussing it first.
-- =============================================================================

SELECT
    d.name                          AS DatabaseName,
    d.is_query_store_on,
    qso.actual_state_desc,
    qso.readonly_reason,
    qso.desired_state_desc,
    qso.current_storage_size_mb,
    qso.max_storage_size_mb,
    qso.query_capture_mode_desc,
    qso.size_based_cleanup_mode_desc,
    qso.stale_query_threshold_days,
    qso.interval_length_minutes
FROM sys.databases d
OUTER APPLY (
    SELECT *
    FROM sys.database_query_store_options
) qso
WHERE d.database_id = DB_ID();
