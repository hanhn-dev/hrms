-- =============================================================================
-- diagnose-indirect-reportee-count.sql
--
-- Purpose:  Reproduces Sp_CM_Mydetails_DirectIndirectReports / _Count exactly
--           (same hierarchy walk, same Title/visibility/active filters) for a
--           single @EmployeeId, and shows:
--             - the CURRENT (buggy) Direct / Indirect counts - matches what
--               the My Details tabs show today
--             - the CORRECTED Indirect count (excludes anyone already Direct
--               via the other hierarchy)
--             - the list of employees causing the overlap, and via which path
--           Use this to confirm whether a specific "wrong Indirect Reportees
--           count" report matches the known root cause documented in
--           troubleshooting/employee/README.md, scenario 1.
--
-- When to use: an employee/manager reports their Indirect Reportees count
--           looks wrong, or the same person shows up in both the Direct and
--           Indirect report lists on My Details.
--
-- Inputs:   @EmployeeId (required, unless @EmploymentNumber is set instead) -
--                                    the manager ("self") whose report counts
--                                    are being investigated. Set below.
--           @EmploymentNumber      - set this instead of @EmployeeId if that's
--                                    what you have on hand (e.g. from a
--                                    support ticket or the UI); resolved to
--                                    @EmployeeId automatically below. Leave
--                                    NULL if you're setting @EmployeeId.
--           @IsActive, @EmployerId - left NULL to match the default My Details
--                                    tab view. Only change these if you know
--                                    the UI is calling the SP with something
--                                    other than the defaults.
--
-- Notes:    - Read-only (SELECT only); uses local #temp tables (dropped at
--             the end) - no permanent objects.
--           - Validated against HRM-CL-Prod for EmployeeId 1431: DirectCount
--             here reproduces the UI's "Direct Reportees" count exactly
--             (97), confirming the filters below (Title lookup + the
--             FN_LocationBU_GetAllActiveInActive_EmployeeDetails visibility
--             join) are the ones actually applied by the SP - a hierarchy-
--             only walk without them will NOT match the UI.
--           - Assumes ReportsTo/FunctionalManager form a tree (no cycles).
--             The walk stops naturally when a level adds no new rows.
-- =============================================================================

DECLARE @EmployeeId INT = 1431;                    -- <<< set this if you have the EmployeeId
DECLARE @EmploymentNumber NVARCHAR(20) = NULL;      -- <<< or set this instead, e.g. 'E0001'
DECLARE @IsActive CHAR(1) = NULL;
DECLARE @EmployerId INT = NULL;

IF @EmploymentNumber IS NOT NULL
    SELECT @EmployeeId = EmployeeId
    FROM TEmployeeInfo WITH (NOLOCK)
    WHERE EmploymentNumber = @EmploymentNumber;

IF (@IsActive = '') SET @IsActive = NULL;

DECLARE @Lv_EmployerId INT;
IF @EmployerId IS NULL
    SELECT @Lv_EmployerId = EmployerId FROM TEmployee WHERE EmployeeId = @EmployeeId;
ELSE
    SET @Lv_EmployerId = @EmployerId;

DECLARE @Lv_RoleName VARCHAR(100);
SELECT @Lv_RoleName = dbo.FN_GetRoleName(
    (SELECT RoleID FROM TUsers WITH(NOLOCK)
     WHERE UserID = (SELECT UserId FROM TUserEmployee WITH(NOLOCK) WHERE EmployeeID = @EmployeeId)), NULL);

IF OBJECT_ID('tempdb..#OrgHier') IS NOT NULL DROP TABLE #OrgHier;
IF OBJECT_ID('tempdb..#FunHier') IS NOT NULL DROP TABLE #FunHier;
CREATE TABLE #OrgHier (EmployeeId INT PRIMARY KEY, RankLevel INT);
CREATE TABLE #FunHier (EmployeeId INT PRIMARY KEY, RankLevel INT);
INSERT INTO #OrgHier VALUES (@EmployeeId, 0);
INSERT INTO #FunHier VALUES (@EmployeeId, 0);

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

-- The three candidate EmployeeId sets, before the SP's Title/visibility/active filters
IF OBJECT_ID('tempdb..#ScopeDirect') IS NOT NULL DROP TABLE #ScopeDirect;
IF OBJECT_ID('tempdb..#ScopeIndirectCurrent') IS NOT NULL DROP TABLE #ScopeIndirectCurrent;
IF OBJECT_ID('tempdb..#ScopeIndirectCorrected') IS NOT NULL DROP TABLE #ScopeIndirectCorrected;
CREATE TABLE #ScopeDirect (EmployeeId INT PRIMARY KEY);
CREATE TABLE #ScopeIndirectCurrent (EmployeeId INT PRIMARY KEY);
CREATE TABLE #ScopeIndirectCorrected (EmployeeId INT PRIMARY KEY);

INSERT INTO #ScopeDirect (EmployeeId)
SELECT EmployeeId FROM #OrgHier WHERE RankLevel = 1
UNION SELECT EmployeeId FROM #FunHier WHERE RankLevel = 1;

INSERT INTO #ScopeIndirectCurrent (EmployeeId)          -- what the SP currently returns (buggy)
SELECT EmployeeId FROM #OrgHier WHERE RankLevel >= 2
UNION SELECT EmployeeId FROM #FunHier WHERE RankLevel >= 2;

INSERT INTO #ScopeIndirectCorrected (EmployeeId)        -- what it should return after the fix
SELECT EmployeeId FROM #OrgHier WHERE RankLevel >= 2
    AND EmployeeId NOT IN (SELECT EmployeeId FROM #FunHier WHERE RankLevel = 1)
UNION SELECT EmployeeId FROM #FunHier WHERE RankLevel >= 2
    AND EmployeeId NOT IN (SELECT EmployeeId FROM #OrgHier WHERE RankLevel = 1);

-- Apply the SAME Title / visibility / active filters the real SP applies to its final result
SELECT
    @EmployeeId AS EmployeeId,
    (SELECT COUNT(DISTINCT E.EmployeeId)
     FROM #ScopeDirect S
     INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = S.EmployeeId
     INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
     INNER JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
     INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)) X
         ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId
     WHERE E.IsActive <> 'P' AND E.EmployerId = @Lv_EmployerId
       AND (
             (UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR') AND (@IsActive IS NULL OR E.IsActive = @IsActive))
             OR (UPPER(ISNULL(@Lv_RoleName, '')) NOT IN ('ADMINISTRATOR', 'HR') AND E.IsActive = 'Y')
           )
    ) AS DirectCount,
    (SELECT COUNT(DISTINCT E.EmployeeId)
     FROM #ScopeIndirectCurrent S
     INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = S.EmployeeId
     INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
     INNER JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
     INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)) X
         ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId
     WHERE E.IsActive <> 'P' AND E.EmployerId = @Lv_EmployerId
       AND (
             (UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR') AND (@IsActive IS NULL OR E.IsActive = @IsActive))
             OR (UPPER(ISNULL(@Lv_RoleName, '')) NOT IN ('ADMINISTRATOR', 'HR') AND E.IsActive = 'Y')
           )
    ) AS IndirectCount_CurrentBuggy,
    (SELECT COUNT(DISTINCT E.EmployeeId)
     FROM #ScopeIndirectCorrected S
     INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = S.EmployeeId
     INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
     INNER JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
     INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)) X
         ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId
     WHERE E.IsActive <> 'P' AND E.EmployerId = @Lv_EmployerId
       AND (
             (UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR') AND (@IsActive IS NULL OR E.IsActive = @IsActive))
             OR (UPPER(ISNULL(@Lv_RoleName, '')) NOT IN ('ADMINISTRATOR', 'HR') AND E.IsActive = 'Y')
           )
    ) AS IndirectCount_Corrected;

-- Detail: of the employees the SP would actually display, which ones are double-counted
-- (pass the same filters, appear in both #ScopeDirect and #ScopeIndirectCurrent)
SELECT
    d.EmployeeId,
    d.EmploymentNumber,
    CASE WHEN oh.RankLevel = 1 THEN 'Direct (Org)' END              AS DirectViaOrg,
    CASE WHEN fh.RankLevel = 1 THEN 'Direct (Functional)' END       AS DirectViaFunctional,
    CASE WHEN oh.RankLevel >= 2 THEN oh.RankLevel END               AS IndirectOrgRank,
    CASE WHEN fh.RankLevel >= 2 THEN fh.RankLevel END               AS IndirectFunctionalRank
FROM (
    SELECT DISTINCT E.EmployeeId, EI.EmploymentNumber
    FROM #ScopeDirect S
    INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = S.EmployeeId
    INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
    INNER JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
    INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)) X
        ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId
    WHERE E.IsActive <> 'P' AND E.EmployerId = @Lv_EmployerId
      AND (
            (UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR') AND (@IsActive IS NULL OR E.IsActive = @IsActive))
            OR (UPPER(ISNULL(@Lv_RoleName, '')) NOT IN ('ADMINISTRATOR', 'HR') AND E.IsActive = 'Y')
          )
) d
INNER JOIN (
    SELECT DISTINCT E.EmployeeId
    FROM #ScopeIndirectCurrent S
    INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = S.EmployeeId
    INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
    INNER JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
    INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)) X
        ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId
    WHERE E.IsActive <> 'P' AND E.EmployerId = @Lv_EmployerId
      AND (
            (UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR') AND (@IsActive IS NULL OR E.IsActive = @IsActive))
            OR (UPPER(ISNULL(@Lv_RoleName, '')) NOT IN ('ADMINISTRATOR', 'HR') AND E.IsActive = 'Y')
          )
) i ON i.EmployeeId = d.EmployeeId
LEFT JOIN #OrgHier oh ON oh.EmployeeId = d.EmployeeId
LEFT JOIN #FunHier fh ON fh.EmployeeId = d.EmployeeId
ORDER BY d.EmployeeId;

DROP TABLE #OrgHier;
DROP TABLE #FunHier;
DROP TABLE #ScopeDirect;
DROP TABLE #ScopeIndirectCurrent;
DROP TABLE #ScopeIndirectCorrected;
