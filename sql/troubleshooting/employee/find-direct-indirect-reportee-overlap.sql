-- =============================================================================
-- find-direct-indirect-reportee-overlap.sql
--
-- Purpose:  Finds every (Manager, Report) pair where the report would be
--           counted as BOTH Direct and Indirect by
--           Sp_CM_Mydetails_DirectIndirectReports / _Count for that manager.
--           Root cause: the org-chart hierarchy (TORGChart.ReportsTo) and the
--           functional hierarchy (TEmployeeInfo.FunctionalManager) are walked
--           and ranked independently, and RankLevel=1 (Direct) in one tree
--           does not exclude a RankLevel>=2 (Indirect) hit in the other tree.
--           See troubleshooting/employee/README.md, scenario 1.
--
-- When to use: scoping how widespread the Indirect-count bug is - e.g. before
--           deciding whether a fix needs to go out broadly or is a one-off,
--           or to find which managers/tenants are currently affected.
--
-- Inputs:   @EmployerId (optional) - restrict to one tenant. NULL = all tenants.
--           @ManagerId  (optional) - restrict to one manager's EmployeeId. NULL = all.
--           Passing at least one of these is STRONGLY recommended - the
--           unfiltered, all-tenant scan builds ancestor closures for every
--           employee and can be slow on a large database.
--
-- Type:     Read-only (SELECT only).
-- Notes:    Assumes ReportsTo/FunctionalManager form a tree (no cycles).
--           Recursion is capped at 20 levels as a safety net.
-- =============================================================================

DECLARE @EmployerId INT = NULL;   -- <<< set to a tenant EmployerId to scope, or leave NULL
DECLARE @ManagerId  INT = NULL;   -- <<< set to a specific manager's EmployeeId, or leave NULL

;WITH OrgAncestors AS (
    SELECT o.EmployeeId AS DescendantId, o.ReportsTo AS AncestorId, 1 AS Distance
    FROM TORGChart o WITH (NOLOCK)
    WHERE o.ReportsTo IS NOT NULL AND o.ReportsTo <> o.EmployeeId
    UNION ALL
    SELECT oa.DescendantId, o.ReportsTo, oa.Distance + 1
    FROM OrgAncestors oa
    INNER JOIN TORGChart o WITH (NOLOCK) ON o.EmployeeId = oa.AncestorId
    WHERE o.ReportsTo IS NOT NULL AND o.ReportsTo <> o.EmployeeId
      AND oa.Distance < 20
),
FunAncestors AS (
    SELECT fi.EmployeeId AS DescendantId, fi.FunctionalManager AS AncestorId, 1 AS Distance
    FROM TEmployeeInfo fi WITH (NOLOCK)
    WHERE fi.FunctionalManager IS NOT NULL AND fi.FunctionalManager <> fi.EmployeeId
    UNION ALL
    SELECT fa.DescendantId, fi.FunctionalManager, fa.Distance + 1
    FROM FunAncestors fa
    INNER JOIN TEmployeeInfo fi WITH (NOLOCK) ON fi.EmployeeId = fa.AncestorId
    WHERE fi.FunctionalManager IS NOT NULL AND fi.FunctionalManager <> fi.EmployeeId
      AND fa.Distance < 20
)
SELECT DISTINCT
    te.EmployerId,
    oa.AncestorId    AS ManagerId,
    oa.DescendantId  AS OverlappingReportId,
    'Direct via Org, Indirect via Functional' AS OverlapType
FROM OrgAncestors oa
INNER JOIN FunAncestors fa ON fa.AncestorId = oa.AncestorId AND fa.DescendantId = oa.DescendantId
INNER JOIN TEmployee te WITH (NOLOCK) ON te.EmployeeId = oa.DescendantId AND te.IsActive = 'Y'
WHERE oa.Distance = 1 AND fa.Distance >= 2
  AND (@EmployerId IS NULL OR te.EmployerId = @EmployerId)
  AND (@ManagerId IS NULL OR oa.AncestorId = @ManagerId)

UNION ALL

SELECT DISTINCT
    te.EmployerId,
    fa.AncestorId,
    fa.DescendantId,
    'Direct via Functional, Indirect via Org' AS OverlapType
FROM FunAncestors fa
INNER JOIN OrgAncestors oa ON oa.AncestorId = fa.AncestorId AND oa.DescendantId = fa.DescendantId
INNER JOIN TEmployee te WITH (NOLOCK) ON te.EmployeeId = fa.DescendantId AND te.IsActive = 'Y'
WHERE fa.Distance = 1 AND oa.Distance >= 2
  AND (@EmployerId IS NULL OR te.EmployerId = @EmployerId)
  AND (@ManagerId IS NULL OR fa.AncestorId = @ManagerId)

ORDER BY ManagerId, OverlappingReportId;
