-- =============================================================================
-- compare-count-rewrite.sql
--
-- Purpose:  Diff Sp_CM_Mydetails_DirectIndirectReports_Count (rewritten)
--           against the local DEV clone
--           Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy.
--
-- When to use: after deploying the rewritten Count SP to DEV. Expect zero
--           rows from the single-employer delta result set, and NewCount =
--           Legacy(10) + Legacy(46) for the multi-employer check.
--
-- Inputs:   fixtures below (EmployeeId 1431/1432, ranks, IsActive, employers).
--
-- Notes:    - Requires the _Legacy procedure to exist on the target database.
--           - Temp tables only; no permanent writes.
--           - INSERT EXEC of the count SPs; each call can be slow for rank -3.
-- =============================================================================

SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#Fixture') IS NOT NULL DROP TABLE #Fixture;
IF OBJECT_ID('tempdb..#Legacy') IS NOT NULL DROP TABLE #Legacy;
IF OBJECT_ID('tempdb..#Rewritten') IS NOT NULL DROP TABLE #Rewritten;

CREATE TABLE #Fixture (
  EmployeeId INT NOT NULL,
  RankLevel INT NOT NULL,
  IsActive CHAR(1) NULL,
  EmployerId INT NULL
);

CREATE TABLE #Legacy (
  EmployeeId INT NOT NULL,
  RankLevel INT NOT NULL,
  IsActive CHAR(1) NULL,
  EmployerId INT NULL,
  EmployeeCount INT NOT NULL
);

CREATE TABLE #Rewritten (
  EmployeeId INT NOT NULL,
  RankLevel INT NOT NULL,
  IsActive CHAR(1) NULL,
  EmployerId VARCHAR(100) NULL,
  EmployeeCount INT NOT NULL
);

INSERT INTO #Fixture (EmployeeId, RankLevel, IsActive, EmployerId)
SELECT e.EmployeeId, r.RankLevel, a.IsActive, emp.EmployerId
FROM (VALUES (1431), (1432)) e(EmployeeId)
CROSS JOIN (VALUES (-1), (0), (1), (-2), (-3)) r(RankLevel)
CROSS JOIN (VALUES (CAST(NULL AS CHAR(1))), ('Y'), ('N')) a(IsActive)
CROSS JOIN (VALUES (10), (46)) emp(EmployerId);

DECLARE @EmployeeId INT, @RankLevel INT, @IsActive CHAR(1), @EmployerId INT;
DECLARE @Count TABLE (EmployeeCount INT);

DECLARE fixtureCur CURSOR LOCAL FAST_FORWARD FOR
  SELECT EmployeeId, RankLevel, IsActive, EmployerId
  FROM #Fixture;

OPEN fixtureCur;
FETCH NEXT FROM fixtureCur INTO @EmployeeId, @RankLevel, @IsActive, @EmployerId;

WHILE @@FETCH_STATUS = 0
BEGIN
  DELETE FROM @Count;
  INSERT INTO @Count (EmployeeCount)
  EXEC dbo.Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy
    @EmployeeId = @EmployeeId,
    @RankLevel = @RankLevel,
    @IsActive = @IsActive,
    @EmployerId = @EmployerId;

  INSERT INTO #Legacy (EmployeeId, RankLevel, IsActive, EmployerId, EmployeeCount)
  SELECT @EmployeeId, @RankLevel, @IsActive, @EmployerId, ISNULL((SELECT TOP (1) EmployeeCount FROM @Count), 0);

  DELETE FROM @Count;
  INSERT INTO @Count (EmployeeCount)
  EXEC dbo.Sp_CM_Mydetails_DirectIndirectReports_Count
    @EmployeeId = @EmployeeId,
    @RankLevel = @RankLevel,
    @IsActive = @IsActive,
    @EmployerId = @EmployerId;

  INSERT INTO #Rewritten (EmployeeId, RankLevel, IsActive, EmployerId, EmployeeCount)
  SELECT @EmployeeId, @RankLevel, @IsActive, @EmployerId, ISNULL((SELECT TOP (1) EmployeeCount FROM @Count), 0);

  FETCH NEXT FROM fixtureCur INTO @EmployeeId, @RankLevel, @IsActive, @EmployerId;
END

CLOSE fixtureCur;
DEALLOCATE fixtureCur;

-- NULL employer: rewritten blank CSV must match legacy NULL (employee's own employer).
DECLARE @NullEmployeeId INT = 1431;
DECLARE @NullRank INT = 0;

DELETE FROM @Count;
INSERT INTO @Count (EmployeeCount)
EXEC dbo.Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy
  @EmployeeId = @NullEmployeeId,
  @RankLevel = @NullRank,
  @IsActive = NULL,
  @EmployerId = NULL;

INSERT INTO #Legacy (EmployeeId, RankLevel, IsActive, EmployerId, EmployeeCount)
SELECT @NullEmployeeId, @NullRank, NULL, NULL, ISNULL((SELECT TOP (1) EmployeeCount FROM @Count), 0);

DELETE FROM @Count;
INSERT INTO @Count (EmployeeCount)
EXEC dbo.Sp_CM_Mydetails_DirectIndirectReports_Count
  @EmployeeId = @NullEmployeeId,
  @RankLevel = @NullRank,
  @IsActive = NULL,
  @EmployerId = NULL;

INSERT INTO #Rewritten (EmployeeId, RankLevel, IsActive, EmployerId, EmployeeCount)
SELECT @NullEmployeeId, @NullRank, NULL, NULL, ISNULL((SELECT TOP (1) EmployeeCount FROM @Count), 0);

SELECT
  L.EmployeeId,
  L.RankLevel,
  L.IsActive,
  L.EmployerId,
  L.EmployeeCount AS LegacyCount,
  R.EmployeeCount AS NewCount,
  R.EmployeeCount - L.EmployeeCount AS Delta
FROM #Legacy L
INNER JOIN #Rewritten R
  ON R.EmployeeId = L.EmployeeId
 AND R.RankLevel = L.RankLevel
 AND ISNULL(R.IsActive, CHAR(0)) = ISNULL(L.IsActive, CHAR(0))
 AND ISNULL(TRY_CAST(R.EmployerId AS INT), -1) = ISNULL(L.EmployerId, -1)
WHERE L.EmployeeCount <> R.EmployeeCount;

-- Multi-employer: New('10,46') vs Legacy(10) + Legacy(46)
DECLARE @CsvEmployeeId INT = 1432;
DECLARE @CsvRank INT = 0;
DECLARE @CsvNew INT;
DECLARE @CsvLegacySum INT;

DELETE FROM @Count;
INSERT INTO @Count (EmployeeCount)
EXEC dbo.Sp_CM_Mydetails_DirectIndirectReports_Count
  @EmployeeId = @CsvEmployeeId,
  @RankLevel = @CsvRank,
  @IsActive = NULL,
  @EmployerId = '10,46';

SELECT @CsvNew = ISNULL((SELECT TOP (1) EmployeeCount FROM @Count), 0);

SELECT @CsvLegacySum = SUM(EmployeeCount)
FROM #Legacy
WHERE EmployeeId = @CsvEmployeeId
  AND RankLevel = @CsvRank
  AND IsActive IS NULL
  AND EmployerId IN (10, 46);

SELECT
  @CsvEmployeeId AS EmployeeId,
  @CsvRank AS RankLevel,
  '10,46' AS EmployerId,
  @CsvNew AS NewCount,
  @CsvLegacySum AS LegacySum,
  @CsvNew - @CsvLegacySum AS Delta;
GO
