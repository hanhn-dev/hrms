CREATE PROCEDURE Sp_CM_Mydetails_DirectIndirectReports
(
  @EmployeeId INT = NULL,
  @RankLevel INT = NULL,              -- -1 Self; 0 Direct; 1 Indirect; -2 Direct+Indirect; -3 All employees (HR/Admin)
  @IsActive CHAR(1) = NULL,           -- Y / N / NULL (both)
  @EmployerId INT = NULL,

  -- New: JSON array of filter conditions. Example:
  --[
  --  {"Field":"Business Unit","Operator":"Equals","Value":"42"},
  --  {"Field":"Designation","Operator":"Contains","Value":"Manager"},
  --  {"Field":"Date of Joining","Operator":"Between","Value":"2021-01-01","Value2":"2022-12-31"},
  --  {"Field":"Gender","Operator":"Equals","Value":"Male"},
  --  {"Field":"Employment Type","Operator":"In","Values":["Permanent","Contract"]},
  --  {"Field":"Base Location","Operator":"Not In","Values":["Chennai","Mumbai"]},
  --  {"Field":"Last Working Day","Operator":"After","Value":"2023-12-31"}
  --]
  @FiltersJson NVARCHAR(MAX) = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  EXEC Sp_OpenEncryptionKeys;

  IF (@IsActive = '')
    SET @IsActive = NULL;

  DECLARE @Lv_EmployerId INT;

  IF @EmployerId IS NULL
    SELECT
      @Lv_EmployerId = EmployerId
    FROM TEmployee
    WHERE EmployeeId = @EmployeeId;
  ELSE
    SET @Lv_EmployerId = @EmployerId;

  DECLARE @IsCrossReportingApplicable CHAR(1);

  SELECT
    @IsCrossReportingApplicable = IsCrossReportingApplicable
  FROM TEmployerDetails
  WHERE EmployerId = @Lv_EmployerId;

  DECLARE @Lv_RoleName VARCHAR(100);

  SELECT
    @Lv_RoleName = dbo.FN_GetRoleName(
      (
        SELECT RoleID
        FROM TUsers
        WHERE UserID =
        (
          SELECT UserId
          FROM TUserEmployee
          WHERE EmployeeID = @EmployeeId
        )
      ),
      NULL
    );

  -- Hierarchy tables
  DECLARE @lv_Hierarchy TABLE
  (
    EmployeeId INT PRIMARY KEY,
    RankLevel INT
  );

  DECLARE @lv_HierarchyFun TABLE
  (
    EmployeeId INT PRIMARY KEY,
    RankLevel INT
  );

  INSERT INTO @lv_Hierarchy
  VALUES (@EmployeeId, 0);

  INSERT INTO @lv_HierarchyFun
  VALUES (@EmployeeId, 0);

  IF @RankLevel <> -1
  BEGIN
    DECLARE @lev INT = 1, @cnt INT = 1;

    WHILE (@cnt > 0)
    BEGIN
      INSERT INTO @lv_Hierarchy
      (
        EmployeeId,
        RankLevel
      )
      SELECT
        o.EmployeeId,
        @lev
      FROM TORGChart o
      INNER JOIN TEmployee te
        ON te.EmployeeId = o.EmployeeId
         AND te.IsActive = 'Y'
      WHERE o.ReportsTo IN
      (
        SELECT EmployeeId
        FROM @lv_Hierarchy
        WHERE RankLevel = @lev - 1
      )
      AND o.ReportsTo <> o.EmployeeID
      AND NOT EXISTS
      (
        SELECT 1
        FROM @lv_Hierarchy h
        WHERE h.EmployeeId = o.EmployeeId
      );

      SELECT
        @cnt = COUNT(1)
      FROM TORGChart o
      INNER JOIN TEmployee te
        ON te.EmployeeId = o.EmployeeId
         AND te.IsActive = 'Y'
      WHERE o.ReportsTo IN
      (
        SELECT EmployeeId
        FROM @lv_Hierarchy
        WHERE RankLevel = @lev
      )
      AND o.ReportsTo <> o.EmployeeID;

      SET @lev += 1;

      IF @RankLevel = 0
        BREAK;
    END;
  END;

  IF @RankLevel <> -1
  BEGIN
    DECLARE @levf INT = 1, @cntf INT = 1;

    WHILE (@cntf > 0)
    BEGIN
      INSERT INTO @lv_HierarchyFun
      (
        EmployeeId,
        RankLevel
      )
      SELECT
        o.EmployeeId,
        @levf
      FROM TEmployeeInfo o
      INNER JOIN TEmployee te
        ON te.EmployeeId = o.EmployeeId
         AND te.IsActive = 'Y'
      WHERE o.FunctionalManager IN
      (
        SELECT EmployeeId
        FROM @lv_HierarchyFun
        WHERE RankLevel = @levf - 1
      )
      AND o.EmployeeId <> o.FunctionalManager
      AND NOT EXISTS
      (
        SELECT 1
        FROM @lv_HierarchyFun h
        WHERE h.EmployeeId = o.EmployeeId
      );

      SELECT
        @cntf = COUNT(1)
      FROM TEmployeeInfo o
      INNER JOIN TEmployee te
        ON te.EmployeeId = o.EmployeeId
         AND te.IsActive = 'Y'
      WHERE o.FunctionalManager IN
      (
        SELECT EmployeeId
        FROM @lv_HierarchyFun
        WHERE RankLevel = @levf
      )
      AND o.EmployeeId <> o.FunctionalManager;

      SET @levf += 1;

      IF @RankLevel = 0
        BREAK;
    END;
  END;

  -- Scope temp table (dynamic SQL can see it)
  IF OBJECT_ID('tempdb..#Scope') IS NOT NULL
    DROP TABLE #Scope;

  CREATE TABLE #Scope
  (
    EmployeeId INT PRIMARY KEY
  );

  IF @RankLevel = -1
    INSERT INTO #Scope
    VALUES (@EmployeeId);
  ELSE IF @RankLevel = 0
    INSERT INTO #Scope
    (
      EmployeeId
    )
    SELECT EmployeeId
    FROM @lv_Hierarchy
    WHERE RankLevel = 1
    UNION
    SELECT EmployeeId
    FROM @lv_HierarchyFun
    WHERE RankLevel = 1;
  ELSE IF @RankLevel = 1
    INSERT INTO #Scope
    (
      EmployeeId
    )
    SELECT EmployeeId
    FROM @lv_Hierarchy
    WHERE RankLevel >= 2
    UNION
    SELECT EmployeeId
    FROM @lv_HierarchyFun
    WHERE RankLevel >= 2;
  ELSE IF @RankLevel = -2
    INSERT INTO #Scope
    (
      EmployeeId
    )
    SELECT EmployeeId
    FROM @lv_Hierarchy
    WHERE RankLevel >= 1
    UNION
    SELECT EmployeeId
    FROM @lv_HierarchyFun
    WHERE RankLevel >= 1;
  ELSE IF @RankLevel = -3
  BEGIN
    INSERT INTO #Scope
    (
      EmployeeId
    )
    SELECT
      E.EmployeeId
    FROM TEmployee E
    INNER JOIN TEmployeeInfo EI
      ON EI.EmployeeId = E.EmployeeId
       AND EI.EmployerID = E.EmployerID
    INNER JOIN
    (
      SELECT
        EmployeeId,
        EmployerId
      FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, @Lv_EmployerId)
    ) S
      ON S.EmployeeId = E.EmployeeId
       AND S.EmployerId = E.EmployerId
    WHERE E.EmployerId = @Lv_EmployerId
      AND E.IsActive <> 'P'
      AND (@IsActive IS NULL OR E.IsActive = @IsActive);
  END;

  -- Filters table
  DECLARE @Filters TABLE
  (
    Field NVARCHAR(100),
    Operator NVARCHAR(50),
    Value NVARCHAR(4000) NULL,
    Value2 NVARCHAR(4000) NULL,
    ValuesJson NVARCHAR(MAX) NULL
  );

  IF @FiltersJson IS NOT NULL
     AND LTRIM(RTRIM(@FiltersJson)) <> ''
  BEGIN
    INSERT INTO @Filters
    (
      Field,
      Operator,
      Value,
      Value2,
      ValuesJson
    )
    SELECT
      JSON_VALUE(j.value, '$.Field'),
      JSON_VALUE(j.value, '$.Operator'),
      JSON_VALUE(j.value, '$.Value'),
      JSON_VALUE(j.value, '$.Value2'),
      JSON_QUERY(j.value, '$.Values')
    FROM OPENJSON(@FiltersJson) j;
  END;

  -- Build AND WHERE without "AND AND"
  DECLARE @where NVARCHAR(MAX) = N'';

  DECLARE @Field NVARCHAR(100),
      @Op NVARCHAR(50),
      @Val NVARCHAR(4000),
      @Val2 NVARCHAR(4000),
      @Vals NVARCHAR(MAX);

  DECLARE curBuild CURSOR FAST_FORWARD FOR
    SELECT
      Field,
      Operator,
      Value,
      Value2,
      ValuesJson
    FROM @Filters
    WHERE Field IS NOT NULL
      AND Operator IS NOT NULL;

  OPEN curBuild;

  WHILE 1 = 1
  BEGIN
    FETCH NEXT FROM curBuild INTO @Field, @Op, @Val, @Val2, @Vals;

    IF @@FETCH_STATUS <> 0
      BREAK;

    DECLARE @col NVARCHAR(400) = NULL;
    DECLARE @type NVARCHAR(20) = NULL;

    -- Your current mappings
    IF @Field = N'Business Unit'
    BEGIN
      SET @col = N'EI.BusinessUnitId';
      SET @type = N'dropdown';
    END;

    IF @Field = N'Grade'
    BEGIN
      SET @col = N'EI.Grade';
      SET @type = N'dropdown';
    END;

    IF @Field = N'Designation'
    BEGIN
      SET @col = N'CAST(T.ID AS NVARCHAR(50))';
      SET @type = N'text';
    END;

    IF @Field = N'Employment Type'
    BEGIN
      SET @col = N'EI.EmploymentTypeid';
      SET @type = N'dropdown';
    END;

    IF @Field = N'Work Location'
    BEGIN
      SET @col = N'EI.WorkLocation';
      SET @type = N'dropdown';
    END;

    IF @Field = N'Date of Joining'
    BEGIN
      SET @col = N'EI.DOJ';
      SET @type = N'date';
    END;

    IF @Field = N'Skills'
    BEGIN
      SET @col = N'CAST(TSD.SkillId AS NVARCHAR(50))';
      SET @type = N'text';
    END;

    IF @Field = N'Gender'
    BEGIN
      SET @col = N'CAST(E.Gender AS NVARCHAR(50))';
      SET @type = N'text';
    END;

    IF @Field = N'Role'
    BEGIN
      SET @col = N'CAST(EI.Role AS NVARCHAR(50))';
      SET @type = N'text';
    END;

    IF @Field = N'Domain'
    BEGIN
      SET @col = N'CAST(TDD.DomainId AS NVARCHAR(50))';
      SET @type = N'text';
    END;

    IF @Field = N'Company Experience'
    BEGIN
      SET @col = N'TRY_CONVERT(decimal(10,2), EI.SameOrgPreExp)';
      SET @type = N'derived';
    END;

    IF @Field = N'Last Working Day'
    BEGIN
      SET @col = N'TR.LastWorkingDate';
      SET @type = N'date';
    END;

    IF @Field = N'Base Location'
    BEGIN
      SET @col = N'EI.LocationId';
      SET @type = N'dropdown';
    END;

    IF @col IS NULL
      CONTINUE;

    DECLARE @ValEsc NVARCHAR(4000) = REPLACE(ISNULL(@Val, N''), N'''', N'''''');
    DECLARE @Val2Esc NVARCHAR(4000) = REPLACE(ISNULL(@Val2, N''), N'''', N'''''');
    DECLARE @cond NVARCHAR(MAX) = N'';

    IF @type IN (N'text', N'dropdown')
    BEGIN
      IF @Op = N'Contains'
        SET @cond = @col + N' LIKE N''%' + @ValEsc + N'%''';
      ELSE IF @Op = N'Equals'
        SET @cond = @col + N' = N''' + @ValEsc + N'''';
      ELSE IF @Op = N'Starts With'
        SET @cond = @col + N' LIKE N''' + @ValEsc + N'%''';
      ELSE IF @Op IN (N'In', N'Not In')
      BEGIN
        DECLARE @csv NVARCHAR(MAX);

        SELECT
          @csv = STRING_AGG(N'''' + REPLACE([value], '''', '''''') + N'''', N',')
        FROM OPENJSON(ISNULL(@Vals, N'[]'));

        IF @csv IS NOT NULL
           AND LTRIM(RTRIM(@csv)) <> ''
        BEGIN
          IF @Op = N'In'
            SET @cond = @col + N' IN (' + @csv + N')';
          ELSE
            SET @cond = @col + N' NOT IN (' + @csv + N')';
        END;
      END;
      ELSE IF @Op = N'Is'
      BEGIN
        IF UPPER(LTRIM(RTRIM(@Val))) = N'NULL'
          SET @cond = @col + N' IS NULL';
        ELSE IF UPPER(LTRIM(RTRIM(@Val))) = N'NOT NULL'
          SET @cond = @col + N' IS NOT NULL';
        ELSE
          SET @cond = @col + N' = N''' + @ValEsc + N'''';
      END;
    END;
    ELSE IF @type = N'date'
    BEGIN
      IF @Op = N'Before'
        SET @cond = @col + N' < TRY_CONVERT(date, N''' + @ValEsc + N''', 23)';
      ELSE IF @Op = N'After'
        SET @cond = @col + N' > TRY_CONVERT(date, N''' + @ValEsc + N''', 23)';
      ELSE IF @Op = N'Between'
        SET @cond = @col + N' BETWEEN TRY_CONVERT(date, N''' + @ValEsc + N''', 23) AND TRY_CONVERT(date, N''' + @Val2Esc + N''', 23)';
    END;
    ELSE IF @type = N'derived'
    BEGIN
      IF @Op = N'After'
        SET @cond = @col + N' > TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''')';
      ELSE IF @Op = N'Before'
        SET @cond = @col + N' < TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''')';
      ELSE IF @Op = N'Equals'
        SET @cond = @col + N' = TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''')';
      ELSE IF @Op = N'Between'
        SET @cond = @col + N' BETWEEN TRY_CONVERT(decimal(10,2), N''' + @ValEsc + N''') AND TRY_CONVERT(decimal(10,2), N''' + @Val2Esc + N''')';
    END;

    IF @cond <> N''
    BEGIN
      IF @where <> N''
        SET @where += N' AND ';
      SET @where += @cond;
    END;
  END;

  CLOSE curBuild;
  DEALLOCATE curBuild;

  -- Base Active rule (your existing behavior)
  DECLARE @baseActive NVARCHAR(MAX) = N'';

  IF UPPER(ISNULL(@Lv_RoleName, '')) IN ('ADMINISTRATOR', 'HR')
    SET @baseActive = N' AND (@IsActive IS NULL OR E.IsActive = @IsActive)';
  ELSE
    SET @baseActive = N' AND E.IsActive = ''Y''';

  -- Final SQL
  DECLARE @mainSql NVARCHAR(MAX) = N'
  SELECT
    E.EmployeeId,
    dbo.Fn_GetEmployeeName(E.EmployeeId) AS EmpName,
    CAST(dbo.Fn_DecryptData(E.LName) AS VARCHAR(50)) AS LName,
    CASE E.IsActive
      WHEN ''Y'' THEN ''Active''
      WHEN ''N'' THEN ''InActive''
    END AS EmployeeStatus,
    [dbo].[FN_GetEmployeeOrgName](@IsCrossReportingApplicable, E.EmployeeId) AS EmployeeName,
    EI.BusinessUnitId,
    EI.EmploymentNumber AS EmploymentNumber,
    BU.[Name] AS BusinessUnit,
    TED.Custid AS CustomerNumber,
    T.Title AS Designation
  FROM #Scope S
  INNER JOIN TEmployee E
    ON E.EmployeeId = S.EmployeeId
  INNER JOIN TEmployeeInfo EI
    ON EI.EmployeeId = E.EmployeeId
     AND EI.EmployerID = E.EmployerId
  INNER JOIN tEmployerDetails TED
    ON TED.EmployerId = EI.EmployerId
  LEFT JOIN TTitle T
    ON T.ID = EI.Title
     AND EI.EmployerID = T.Employerid
  LEFT JOIN TResignationDetails TR
    ON E.EmployeeId = TR.EmployeeID
  LEFT JOIN TEmployeeSkillDetails TSD
    ON E.EmployeeId = TSD.EmployeeId
  LEFT JOIN TEmployeeDomainDetails TDD
    ON E.EmployeeId = TDD.EmployeeId
  INNER JOIN
  (
    SELECT
      EmployeeId,
      EmployerId
    FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
  ) X
    ON X.EmployeeId = E.EmployeeId
     AND X.EmployerId = E.EmployerId
  OUTER APPLY
  (
    SELECT
      [ID],
      [Name]
    FROM [dbo].[FN_GetEmployeeDepartentOrBusinessUnit](EI.EmployeeId, EI.EmployerId)
  ) BU
  WHERE E.IsActive <> ''P''
    AND E.EmployerId = @Lv_EmployerId
    ' + @baseActive + CASE WHEN @where <> N'' THEN N' AND ' + @where ELSE N'' END + N'
  ORDER BY E.EmployeeId;';

  EXEC sp_executesql
    @mainSql,
    N'@EmployeeId INT, @Lv_EmployerId INT, @IsCrossReportingApplicable CHAR(1), @IsActive CHAR(1)',
    @EmployeeId = @EmployeeId,
    @Lv_EmployerId = @Lv_EmployerId,
    @IsCrossReportingApplicable = @IsCrossReportingApplicable,
    @IsActive = @IsActive;

  -- DROP TABLE #Scope;

  EXEC SP_CloseEncryptionKey;
END;