-- Local DEV snapshot of the pre-rewrite Count SP. Not Liquibase. Drop after compare.
IF EXISTS (SELECT 1 FROM SYS.PROCEDURES WHERE NAME='Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy')
BEGIN
DROP PROCEDURE Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy;
END
GO
-- =============================================
--  Modification History
---Chatla Jagapathibabu   31-03-2026   added employerId condition
---Chatla Jagapathibabu   06-05-2026   US-135557
---Chatla Jagapathibabu   19-05-2026   Refactored dynamic JSON filter builder
---Prajakta A Kadam       07 Jul 2026  Perf fix :  Removed unused OUTER APPLY; skip hierarchy walk for -3;
---                                    temp tables + @@ROWCOUNT instead of table vars + COUNT lookahead
---Prajakta A Kadam       08-07-2026   Perf fix: -3 path: dropped redundant NULL-employer TVF join in main query
---                                    (#Scope already built from employer-scoped TVF, proven subset).
---                                    Fixed Last Working Day filter col (TR -> EI).
---Cursor Agent          04-08-2026   Fix indirect count traversal so org and functional hierarchies walk independently.
-- =============================================

CREATE PROCEDURE [dbo].[Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy]
(@EmployeeId INT=NULL,
  @RankLevel INT=NULL,              -- -1 Self; 0 Direct; 1 Indirect; -2 Direct+Indirect; -3 All employees (HR/Admin)
  @IsActive CHAR(1) = NULL,         -- Y / N / NULL (both)
  @EmployerId INT = NULL,
  @FiltersJson NVARCHAR(MAX) = NULL
)
AS
BEGIN
SET NOCOUNT ON;
EXEC Sp_OpenEncryptionKeys;
IF (@IsActive = '') SET @IsActive = NULL;

DECLARE @Lv_EmployerId INT;
IF @EmployerId IS NULL
  SELECT @Lv_EmployerId = EmployerId FROM TEmployee WHERE EmployeeId = @EmployeeId;
ELSE
  SET @Lv_EmployerId = @EmployerId;

DECLARE @IsCrossReportingApplicable CHAR(1);
SELECT @IsCrossReportingApplicable = IsCrossReportingApplicable
FROM TEmployerDetails WITH(NOLOCK) WHERE EmployerId = @Lv_EmployerId;

DECLARE @Lv_RoleName VARCHAR(100);
SELECT @Lv_RoleName = dbo.FN_GetRoleName(
  (SELECT RoleID FROM TUsers WITH(NOLOCK)
   WHERE UserID = (SELECT UserId FROM TUserEmployee WITH(NOLOCK) WHERE EmployeeID = @EmployeeId)), NULL);

IF OBJECT_ID('tempdb..#lv_Hierarchy') IS NOT NULL DROP TABLE #lv_Hierarchy;
IF OBJECT_ID('tempdb..#lv_HierarchyFun') IS NOT NULL DROP TABLE #lv_HierarchyFun;
CREATE TABLE #lv_Hierarchy (EmployeeId INT PRIMARY KEY, RankLevel INT);
CREATE TABLE #lv_HierarchyFun (EmployeeId INT PRIMARY KEY, RankLevel INT);
INSERT INTO #lv_Hierarchy VALUES (@EmployeeId, 0);
INSERT INTO #lv_HierarchyFun VALUES (@EmployeeId, 0);

-- -3 builds #Scope from FN_LocationBU... below and never reads these tables, so skip the walk.
IF @RankLevel NOT IN (-1, -3)
BEGIN
  DECLARE @lev INT = 1, @orgCnt INT = 1, @funCnt INT = 1;
  WHILE (@orgCnt > 0 OR @funCnt > 0)
  BEGIN
   INSERT INTO #lv_Hierarchy (EmployeeId, RankLevel)
   SELECT o.EmployeeId, @lev
   FROM TORGChart o WITH(NOLOCK)
   INNER JOIN TEmployee te WITH(NOLOCK) ON te.EmployeeId = o.EmployeeId AND te.IsActive = 'Y'
   WHERE o.ReportsTo IN (SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel = @lev - 1)
     AND o.ReportsTo <> o.EmployeeID
     AND NOT EXISTS (SELECT 1 FROM #lv_Hierarchy h WHERE h.EmployeeId = o.EmployeeId);
   
   SET @orgCnt = @@ROWCOUNT;

   INSERT INTO #lv_HierarchyFun (EmployeeId, RankLevel)
   SELECT o.EmployeeId, @lev
   FROM TEmployeeInfo o WITH(NOLOCK)
   INNER JOIN TEmployee te WITH(NOLOCK) ON te.EmployeeId = o.EmployeeId AND te.IsActive = 'Y'
   WHERE o.FunctionalManager IN (SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel = @lev - 1)
     AND o.EmployeeId <> o.FunctionalManager
     AND NOT EXISTS (SELECT 1 FROM #lv_HierarchyFun h WHERE h.EmployeeId = o.EmployeeId);
   SET @funCnt = @@ROWCOUNT;
   SET @lev += 1;
   IF @RankLevel = 0 BREAK;
  END
END
CREATE INDEX IX_lv_Hierarchy_RankLevel ON #lv_Hierarchy(RankLevel) INCLUDE (EmployeeId);

IF OBJECT_ID('tempdb..#Scope') IS NOT NULL DROP TABLE #Scope;
CREATE TABLE #Scope (EmployeeId INT PRIMARY KEY);

IF @RankLevel = -1
  INSERT INTO #Scope VALUES (@EmployeeId);
ELSE IF @RankLevel = 0
  INSERT INTO #Scope(EmployeeId)
  SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel = 1
  UNION SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel = 1;
ELSE IF @RankLevel = 1
  INSERT INTO #Scope(EmployeeId)
  SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel >= 2
  UNION SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel >= 2;
ELSE IF @RankLevel = -2
  INSERT INTO #Scope(EmployeeId)
  SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel >= 1
  UNION SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel >= 1;
ELSE IF @RankLevel = -3
BEGIN
  INSERT INTO #Scope(EmployeeId)
  SELECT E.EmployeeId
  FROM TEmployee E WITH(NOLOCK)
  INNER JOIN TEmployeeInfo EI WITH(NOLOCK) ON E.EmployerId = @Lv_EmployerId
    AND E.IsActive IN ('N','Y') AND (@IsActive IS NULL OR E.IsActive = @IsActive)
    AND EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerID
  INNER JOIN (SELECT EmployeeId, EmployerId
              FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, @Lv_EmployerId)) S
   ON S.EmployeeId = E.EmployeeId AND S.EmployerId = E.EmployerId;
END

DECLARE @Filters TABLE (Field NVARCHAR(100),Operator NVARCHAR(50),Value NVARCHAR(4000) NULL,Value2 NVARCHAR(4000) NULL,ValuesJson NVARCHAR(MAX) NULL);
IF @FiltersJson IS NOT NULL AND LTRIM(RTRIM(@FiltersJson)) <> ''
BEGIN
  INSERT INTO @Filters(Field, Operator, Value, Value2, ValuesJson)
  SELECT JSON_VALUE(j.value,'$.Field'),JSON_VALUE(j.value,'$.Operator'),JSON_VALUE(j.value,'$.Value'),JSON_VALUE(j.value,'$.Value2'),JSON_QUERY(j.value,'$.Values')
  FROM OPENJSON(@FiltersJson) j;
END

DECLARE @where NVARCHAR(MAX) = N'';
DECLARE @Field NVARCHAR(100), @Op NVARCHAR(50), @Val NVARCHAR(4000), @Val2 NVARCHAR(4000), @Vals NVARCHAR(MAX);
DECLARE @col NVARCHAR(400), @type NVARCHAR(20), @existsExpr NVARCHAR(MAX);
DECLARE @ValEsc NVARCHAR(4000), @Val2Esc NVARCHAR(4000), @cond NVARCHAR(MAX), @csv NVARCHAR(MAX);

DECLARE curBuild CURSOR FAST_FORWARD FOR
  SELECT Field, Operator, Value, Value2, ValuesJson 
  FROM @Filters WHERE Field IS NOT NULL AND Operator IS NOT NULL;
OPEN curBuild;
WHILE 1 = 1
BEGIN
  FETCH NEXT FROM curBuild INTO @Field, @Op, @Val, @Val2, @Vals;
  IF @@FETCH_STATUS <> 0 BREAK;
  SET @col=NULL; SET @type=NULL; SET @existsExpr=NULL; SET @cond=N'';
  IF @Field = N'Business Unit'      BEGIN SET @col = N'EI.BusinessUnitId'; SET @type = N'dropdown'; END
  IF @Field = N'Grade'              BEGIN SET @col = N'EI.Grade'; SET @type = N'dropdown'; END
  IF @Field = N'Designation'        BEGIN SET @col = N'CAST(EI.Title AS NVARCHAR(50))'; SET @type = N'dropdown'; END
  IF @Field = N'Employment Type'    BEGIN SET @col = N'EI.EmploymentTypeID'; SET @type = N'dropdown'; END
  IF @Field = N'Work Location'      BEGIN SET @col = N'EI.WorkLocation'; SET @type = N'dropdown'; END
  IF @Field = N'Date of Joining'    BEGIN SET @col = N'CAST(EI.DOJ AS date)'; SET @type = N'date'; END
  IF @Field = N'Skills'             BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEmployeeSkillDetails sx WITH (NOLOCK) WHERE sx.EmployeeId = E.EmployeeId AND CAST(sx.SkillId AS NVARCHAR(50))'; SET @type = N'dropdown'; END
  IF @Field = N'Gender'             BEGIN SET @col = N'CAST(E.Gender AS NVARCHAR(50))'; SET @type = N'dropdown'; END
  IF @Field = N'Role'               BEGIN SET @col = N'CAST(EI.EmployeeRoleID AS NVARCHAR(50))'; SET @type = N'dropdown'; END
  IF @Field = N'Domain'             BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEmployeeDomainDetails dx WITH (NOLOCK) WHERE dx.EmployeeId = E.EmployeeId AND CAST(dx.DomainId AS NVARCHAR(50))'; SET @type = N'dropdown'; END
  IF @Field = N'Company Experience' BEGIN SET @col = N'TRY_CONVERT(decimal(10,2), EI.SameOrgPreExp)'; SET @type = N'derived'; END
  IF @Field = N'Last Working Day'   BEGIN SET @col = N'CAST(EI.LastWorkingDate AS date)'; SET @type = N'date'; END
  IF @Field = N'Base Location'      BEGIN SET @col = N'EI.LocationId'; SET @type = N'dropdown'; END
----  IF @Field = N'Base Location'       BEGIN SET @col = N'CAST(EI.LocationId AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'Skill Category'      BEGIN SET @col = N'CAST(EI.CategoryID AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'PAN Number'          BEGIN SET @col = N'CAST(dbo.Fn_DecryptData(E.TaxId) AS NVARCHAR(50))'; SET @type = N'text'; END
 IF @Field = N'Visa Type'           BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEmployeeVisaInfo vi WITH (NOLOCK) WHERE vi.EmployeeId = E.EmployeeId
 AND ISNULL(vi.IsDeleted,''N'') <> ''Y'' AND CAST(vi.VisaType AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'Visa Country'        BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEmployeeVisaInfo vi WITH (NOLOCK) INNER JOIN
 TCOUNTRY tc WITH (NOLOCK) ON tc.ID = vi.Country WHERE vi.EmployeeId = E.EmployeeId AND ISNULL(vi.IsDeleted,''N'') <> ''Y'' AND CAST(tc.ID AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'Certification'       BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TCertificationDetails ced WITH (NOLOCK) WHERE
 ced.EmployeeId = E.EmployeeId AND ISNULL(ced.IsDelete,0) = 0 AND CAST(ced.CertificateId AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'Discipline'          BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEducationDetails ed WITH (NOLOCK) WHERE
 ed.EmployeeId = E.EmployeeId AND ISNULL(ed.IsDelete,0) = 0 AND CAST(ed.Discipline AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'Qualification'       BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEducationDetails ed WITH (NOLOCK) WHERE
 ed.EmployeeId = E.EmployeeId AND ISNULL(ed.IsDelete,0) = 0 AND CAST(ed.Discipline AS NVARCHAR(50))'; SET @type = N'dropdown'; END
 IF @Field = N'Passport Number'     BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEmployeePassportDetails pd WITH (NOLOCK) WHERE
 pd.EmployeeId = E.EmployeeId AND pd.PassportNo'; SET @type = N'text'; END
 IF @Field = N'Valid Up To'         BEGIN SET @existsExpr = N'EXISTS (SELECT 1 FROM TEmployeeVisaInfo vi WITH (NOLOCK) WHERE
 vi.EmployeeId = E.EmployeeId AND ISNULL(vi.IsDeleted,''N'') <> ''Y'' AND CAST(vi.ExpiryDate AS date)'; SET @type = N'date'; END

  IF @col IS NULL AND @existsExpr IS NULL CONTINUE;
  SET @ValEsc = REPLACE(ISNULL(@Val, N''), N'''', N'''''');
  SET @Val2Esc = REPLACE(ISNULL(@Val2, N''), N'''', N'''''');
  IF @Op = N'In Between' SET @Op = N'Between';
  IF @type = N'dropdown'
  BEGIN
   IF @Op = N'Contains' 
   BEGIN IF @existsExpr IS NOT NULL SET @cond = @existsExpr + N' LIKE N''%' + @ValEsc + N'%'')'; 
   ELSE SET @cond = @col + N' LIKE N''%' + @ValEsc + N'%''';  END
   
   ELSE IF @Op = N'Equals' 
   BEGIN IF @existsExpr IS NOT NULL SET @cond = @existsExpr + N' = N''' + @ValEsc + N''')'; 
   ELSE SET @cond = @col + N' = N''' + @ValEsc + N'''';  END
   
   ELSE IF @Op IN (N'In', N'Not In')
   BEGIN
    SELECT @csv = STRING_AGG(N'''' + REPLACE([value], '''', '''''') + N'''', N',') FROM OPENJSON(ISNULL(@Vals, N'[]'));
    IF @csv IS NOT NULL AND LTRIM(RTRIM(@csv)) <> ''
    BEGIN
     IF @existsExpr IS NOT NULL SET @cond = CASE WHEN @Op = N'In' THEN @existsExpr + N' IN (' + @csv + N'))' ELSE N'NOT ' + @existsExpr + N' IN (' + @csv + N'))' END;
     ELSE SET @cond = CASE WHEN @Op = N'In' THEN @col + N' IN (' + @csv + N')' ELSE @col + N' NOT IN (' + @csv + N')' END;
    END
   END
   ELSE IF @Op = N'Is'
   BEGIN
    IF UPPER(LTRIM(RTRIM(@Val))) = N'NULL' SET @cond = @col + N' IS NULL';
    ELSE IF UPPER(LTRIM(RTRIM(@Val))) = N'NOT NULL' SET @cond = @col + N' IS NOT NULL';
    ELSE SET @cond = @col + N' = N''' + @ValEsc + N'''';
   END
  END
  ELSE IF @type = N'text'
  BEGIN
   IF @existsExpr IS NOT NULL
   BEGIN
    IF @Op = N'Ends With'        SET @cond = @existsExpr + N' LIKE N''%' + @ValEsc + N''')';
    ELSE IF @Op = N'Starts With' SET @cond = @existsExpr + N' LIKE N''' + @ValEsc + N'%'')';
    ELSE IF @Op = N'Contains'      SET @cond = @existsExpr + N' LIKE N''%' + @ValEsc + N'%'')';
    ELSE IF @Op = N'Not Contains'  SET @cond = N'NOT ' + @existsExpr + N' LIKE N''%' + @ValEsc + N'%'')';
    ELSE IF @Op = N'Equals'        SET @cond = @existsExpr + N' = N''' + @ValEsc + N''')';
   END
   ELSE
   BEGIN
    IF @Op = N'Ends With'        SET @cond = @col + N' LIKE N''%' + @ValEsc + N'''';
    ELSE IF @Op = N'Starts With' SET @cond = @col + N' LIKE N''' + @ValEsc + N'%''';
    ELSE IF @Op = N'Contains'      SET @cond = @col + N' LIKE N''%' + @ValEsc + N'%''';
    ELSE IF @Op = N'Not Contains'  SET @cond = N'(' + @col + N' NOT LIKE N''%' + @ValEsc + N'%'' OR ' + @col + N' IS NULL)';
    ELSE IF @Op = N'Equals'        SET @cond = @col + N' = N''' + @ValEsc + N'''';
   END
  END 

  ELSE IF @type = N'date'
  BEGIN
   IF @Op = N'Before' SET @cond = @col + N' < TRY_CONVERT(date, N''' + @ValEsc + N''', 23)';
   ELSE IF @Op = N'After' SET @cond = @col + N' > TRY_CONVERT(date, N''' + @ValEsc + N''', 23)';
   ELSE IF @Op = N'Between' SET @cond = @col + N' BETWEEN TRY_CONVERT(date, N''' + @ValEsc + N''', 23) AND TRY_CONVERT(date, N''' + @Val2Esc + N''', 23)';
  END
  ELSE IF @type = N'derived'
  BEGIN
   IF @Op = N'Greater Than' SET @cond = @col + N' > TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''')';
   ELSE IF @Op = N'Less Than' SET @cond = @col + N' < TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''')';
   ELSE IF @Op = N'Equals' SET @cond = @col + N' = TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''')';
   ELSE IF @Op = N'Between' SET @cond = @col + N' BETWEEN TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''') AND TRY_CONVERT(decimal(10,2), N''' + @Val2Esc + N''')';
  END
  IF @cond <> N'' 
  BEGIN IF @where <> N'' 
  SET @where += N' AND '; 
  SET @where += @cond; END
END
CLOSE curBuild; DEALLOCATE curBuild;

DECLARE @baseActive NVARCHAR(MAX) = N'';
IF @RankLevel<>-3
BEGIN
  IF UPPER(ISNULL(@Lv_RoleName,'')) IN ('ADMINISTRATOR','HR') SET @baseActive = N' AND (@IsActive IS NULL OR E.IsActive = @IsActive)';
  ELSE SET @baseActive = N' AND E.IsActive = ''Y''';
END
ELSE IF @RankLevel=-3 SET @baseActive=N' AND (@IsActive IS NULL OR E.IsActive = @IsActive)';

-- PERF: for -3, #Scope already came from the employer-scoped TVF (proven subset of the
-- NULL TVF), so the redundant NULL-TVF join is omitted. Other ranks keep it (security filter).
DECLARE @tvfJoin NVARCHAR(MAX) =
   CASE WHEN @RankLevel = -3 THEN N''
        ELSE N' INNER JOIN (SELECT EmployeeId, EmployerId FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)) X 
  ON X.EmployeeId = E.EmployeeId AND X.EmployerId = E.EmployerId'
   END;

DECLARE @mainSql NVARCHAR(MAX) = N'
SELECT COUNT(distinct E.EmployeeId) AS EmployeeCount
FROM #Scope S
INNER JOIN TEmployee E WITH(NOLOCK) ON E.EmployeeId = S.EmployeeId
INNER JOIN TEmployeeInfo EI WITH(NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
INNER JOIN tEmployerDetails TED WITH(NOLOCK) ON TED.EmployerId = EI.EmployerId
LEFT JOIN TResignationDetails TR WITH(NOLOCK)ON E.EmployeeId = TR.EmployeeID 
LEFT JOIN TTitle T WITH(NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
LEFT JOIN TEmployeeSkillDetails TSD WITH(NOLOCK) ON E.EmployeeId = TSD.EmployeeId
LEFT JOIN TEmployeeDomainDetails TDD WITH(NOLOCK) ON E.EmployeeId = TDD.EmployeeId'
+ @tvfJoin + N'
WHERE E.IsActive <> ''P'' AND E.EmployerId = @Lv_EmployerId AND T.Title IS NOT NULL'
+ @baseActive + CASE WHEN @where <> N'' THEN N' AND ' + @where ELSE N'' END;

EXEC sp_executesql @mainSql,
  N'@EmployeeId INT, @Lv_EmployerId INT, @IsCrossReportingApplicable CHAR(1), @IsActive CHAR(1)',
  @EmployeeId=@EmployeeId, @Lv_EmployerId=@Lv_EmployerId, @IsCrossReportingApplicable=@IsCrossReportingApplicable, @IsActive=@IsActive;

EXEC SP_CloseEncryptionKey;
END