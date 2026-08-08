-- =============================================================================
-- find-direct-indirect-reportee-overlap.sql
--
-- Purpose:  Lists every employee who is Direct in one hierarchy and Indirect
--           in the other for a given manager, per Sp_CM_Mydetails_
--           DirectIndirectReports / _Count. Root cause: the org-chart
--           hierarchy (TORGChart.ReportsTo) and the functional hierarchy
--           (TEmployeeInfo.FunctionalManager) are walked and ranked
--           independently, and RankLevel=1 (Direct) in one tree does not
--           exclude a RankLevel>=2 (Indirect) hit in the other tree.
--           See troubleshooting/employee/README.md, scenario 1, and
--           rca-indirect-reportee-count-double-counting.md for the full
--           writeup.
--
-- Returns TWO separate result sets - do not add their row counts together,
-- they answer different questions:
--   1. "Structural overlap"  - every report where the raw hierarchy data has
--      this overlap, regardless of whether the report would ever actually
--      be shown to the manager (no Title / visibility / active filtering).
--      This is the size of the underlying DATA problem.
--   2. "Visible overlap"     - the subset of (1) that also passes the same
--      Title / Location-BU-visibility / active-employee filters the real
--      SP applies before displaying a report. This is the size of the
--      symptom actually ON SCREEN today, and matches
--      diagnose-indirect-reportee-count.sql's detail list exactly.
--
-- When to use: getting the full, named list behind a manager's overlap
--           count (diagnose-indirect-reportee-count.sql gives the count and
--           a bare list; this script is the same computation, presented as
--           two clearly labeled datasets).
--
-- IMPORTANT - single manager only: this walks the hierarchy from ONE root
--           (@ManagerId), the same cycle-safe way diagnose-indirect-
--           reportee-count.sql does (WHILE loop + NOT EXISTS guard so a
--           node is only ever visited once). @ManagerId is therefore
--           REQUIRED. An earlier version of this script used a global
--           recursive CTE ancestor-closure (no visited-node guard) to scan
--           every manager at once - that was found to massively over-count
--           because TEmployeeInfo.FunctionalManager contains at least one
--           real two-person cycle in this database (13461 <-> 13464,
--           confirmed on HRM-CL-Prod), which a CTE without a visited guard
--           walks repeatedly up to its recursion cap. If you need a
--           multi-manager scan, run this script once per manager rather
--           than reintroducing an unscoped closure.
--
-- Inputs:   @ManagerId  (required) - the manager's EmployeeId to investigate.
--           @EmployerId (optional) - defaults to @ManagerId's own employer.
--           @IsActive   (optional) - left NULL to match the default My
--                       Details tab view.
--
-- Type:     Read-only (SELECT only); uses local #temp tables (dropped at
--           the end) - no permanent objects.
-- Notes:    Assumes ReportsTo/FunctionalManager form a tree once self-loops
--           and the guard below are accounted for. The walk stops naturally
--           when a level adds no new rows, or at 20 levels as a safety cap.
-- =============================================================================

DECLARE @ManagerId  INT = 1431;    -- <<< REQUIRED: set to the manager's EmployeeId being investigated
DECLARE @EmployerId INT = NULL;    -- <<< optional: leave NULL to use @ManagerId's own employer
DECLARE @IsActive   CHAR(1) = NULL;

IF @ManagerId IS NULL
BEGIN
    RAISERROR('find-direct-indirect-reportee-overlap.sql requires @ManagerId to be set - see the header comment for why an unscoped multi-manager scan is unsafe on this database.', 16, 1);
    RETURN;
END

IF (@IsActive = '') SET @IsActive = NULL;

DECLARE @Lv_EmployerId INT;
IF @EmployerId IS NULL
    SELECT @Lv_EmployerId = EmployerId FROM TEmployee WHERE EmployeeId = @ManagerId;
ELSE
    SET @Lv_EmployerId = @EmployerId;

DECLARE @Lv_RoleName VARCHAR(100);
SELECT @Lv_RoleName = dbo.FN_GetRoleName(
    (SELECT RoleID FROM TUsers WITH (NOLOCK)
     WHERE UserID = (SELECT UserId FROM TUserEmployee WITH (NOLOCK) WHERE EmployeeID = @ManagerId)), NULL);

-- ---------------------------------------------------------------------------
-- Cycle-safe hierarchy walk (identical method to diagnose-indirect-reportee-count.sql)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#OrgHier') IS NOT NULL DROP TABLE #OrgHier;
IF OBJECT_ID('tempdb..#FunHier') IS NOT NULL DROP TABLE #FunHier;
CREATE TABLE #OrgHier (EmployeeId INT PRIMARY KEY, RankLevel INT);
CREATE TABLE #FunHier (EmployeeId INT PRIMARY KEY, RankLevel INT);
INSERT INTO #OrgHier VALUES (@ManagerId, 0);
INSERT INTO #FunHier VALUES (@ManagerId, 0);

DECLARE @lev INT = 1, @orgCnt INT = 1, @funCnt INT = 1;
WHILE (@orgCnt > 0 OR @funCnt > 0) AND @lev < 20
BEGIN
    INSERT INTO #OrgHier (EmployeeId, RankLevel)
    SELECT o.EmployeeId, @lev
    FROM TORGChart o WITH (NOLOCK)
    INNER JOIN TEmployee te WITH (NOLOCK) ON te.EmployeeId = o.EmployeeId AND te.IsActive = 'Y'
    WHERE o.ReportsTo IN (SELECT EmployeeId FROM #OrgHier WHERE RankLevel = @lev - 1)
        AND o.ReportsTo <> o.EmployeeId
        AND NOT EXISTS (SELECT 1 FROM #OrgHier h WHERE h.EmployeeId = o.EmployeeId);
    SET @orgCnt = @@ROWCOUNT;

    INSERT INTO #FunHier (EmployeeId, RankLevel)
    SELECT fi.EmployeeId, @lev
    FROM TEmployeeInfo fi WITH (NOLOCK)
    INNER JOIN TEmployee te WITH (NOLOCK) ON te.EmployeeId = fi.EmployeeId AND te.IsActive = 'Y'
    WHERE fi.FunctionalManager IN (SELECT EmployeeId FROM #FunHier WHERE RankLevel = @lev - 1)
        AND fi.EmployeeId <> fi.FunctionalManager
        AND NOT EXISTS (SELECT 1 FROM #FunHier h WHERE h.EmployeeId = fi.EmployeeId);
    SET @funCnt = @@ROWCOUNT;
    SET @lev += 1;
END

-- ---------------------------------------------------------------------------
-- Structural overlap: Direct (RankLevel=1) in one tree, Indirect (>=2) in the other
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#RawOverlap') IS NOT NULL DROP TABLE #RawOverlap;
CREATE TABLE #RawOverlap (EmployeeId INT PRIMARY KEY, OverlapType VARCHAR(60));
INSERT INTO #RawOverlap (EmployeeId, OverlapType)
SELECT oh.EmployeeId, 'Direct via Org, Indirect via Functional'
FROM #OrgHier oh
INNER JOIN #FunHier fh ON fh.EmployeeId = oh.EmployeeId
WHERE oh.RankLevel = 1 AND fh.RankLevel >= 2
UNION ALL
SELECT fh.EmployeeId, 'Direct via Functional, Indirect via Org'
FROM #FunHier fh
INNER JOIN #OrgHier oh ON oh.EmployeeId = fh.EmployeeId
WHERE fh.RankLevel = 1 AND oh.RankLevel >= 2;

-- ---------------------------------------------------------------------------
-- Visible overlap: same filters the real SP applies (Title + Location/BU
-- visibility for @ManagerId + role-based active-employee rule)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#VisibleSet') IS NOT NULL DROP TABLE #VisibleSet;
CREATE TABLE #VisibleSet (EmployeeId INT PRIMARY KEY);
INSERT INTO #VisibleSet (EmployeeId)
SELECT DISTINCT E.EmployeeId
FROM #RawOverlap r
INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = r.EmployeeId
INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
INNER JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@ManagerId, NULL)) X
    ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId
WHERE E.IsActive <> 'P' AND E.EmployerId = @Lv_EmployerId
  AND (
        (UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR') AND (@IsActive IS NULL OR E.IsActive = @IsActive))
        OR (UPPER(ISNULL(@Lv_RoleName, '')) NOT IN ('ADMINISTRATOR', 'HR') AND E.IsActive = 'Y')
      );

-- ---------------------------------------------------------------------------
-- Result set 1: structural overlap (raw hierarchy - the size of the data problem)
-- ---------------------------------------------------------------------------
SELECT
    'Structural (raw hierarchy)' AS DatasetType,
    @ManagerId AS ManagerId,
    r.EmployeeId AS OverlappingReportId,
    EI.EmploymentNumber AS OverlappingReportEmploymentNumber,
    r.OverlapType
FROM #RawOverlap r
LEFT JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = r.EmployeeId
ORDER BY r.EmployeeId;

-- ---------------------------------------------------------------------------
-- Result set 2: visible overlap (matches what's actually double-counted on screen today)
-- ---------------------------------------------------------------------------
SELECT
    'Visible today (matches UI)' AS DatasetType,
    @ManagerId AS ManagerId,
    r.EmployeeId AS OverlappingReportId,
    EI.EmploymentNumber AS OverlappingReportEmploymentNumber,
    r.OverlapType
FROM #RawOverlap r
INNER JOIN #VisibleSet v ON v.EmployeeId = r.EmployeeId
LEFT JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = r.EmployeeId
ORDER BY r.EmployeeId;

DROP TABLE #OrgHier;
DROP TABLE #FunHier;
DROP TABLE #RawOverlap;
DROP TABLE #VisibleSet;
