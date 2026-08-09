/*
================================================================================
 Diagnose FieldType_JSON_SQL failures
================================================================================
 Purpose:
   Scans TEmployeeDetail_Fields.FieldType_JSON_SQL for dynamic dropdown
   queries that are likely to fail at runtime, covering the failure classes
   documented in troubleshooting/fields/rca-fieldtype-json-sql-dynamic-query-failures.md.

   Each failure class below is its own result set, gated by its own on/off
   flag in section 0b -- flip a flag to 0 if you don't want that result set
   cluttering the output. Only run what you're actually chasing.

     2. Unresolved @Token parameters the app layer will never bind.
        SQL error this predicts: "Must declare the scalar variable '@X'"
        Flag: @Check_UnresolvedParams

     3. "?" positional placeholders (always bound to employerId by app code).
        No SQL error by itself -- flags rows worth eyeballing for intent.
        Flag: @Check_PositionalPlaceholder

     5. Column-count mismatch: "DECLARE @TableVar TABLE (...) INSERT INTO
        @TableVar EXEC <proc>" where the proc's live result set has a
        different column COUNT than declared.
        SQL error this predicts: INSERT...EXEC fails outright (column list
        mismatch); message varies by SQL Server version.
        Flag: @Check_ColumnCountMismatch

     6. Truncation risk: same pattern, declared column width narrower than
        the proc's live output, or the live output is unbounded/MAX. Where
        the procedure's output column is a direct passthrough of a real
        table column (sys.dm_exec_describe_first_result_set_for_object
        reports its source_schema/source_table/source_column), this also
        measures the REAL current MAX(LEN(...)) of that column and reports
        whether it is *actually* overflowing today, not just whether the
        column's declared TYPE could theoretically overflow -- a type that
        allows up to 500 characters is not a live problem if nothing in the
        table is currently longer than 40. Columns that are the result of an
        expression/function call (e.g. a resolved display name) cannot be
        traced to a single source column this way and are reported as
        "cannot verify automatically" -- but for those, the script makes a
        second best-effort attempt: it searches the procedure's own source
        text for that column's alias and pulls out the actual expression
        (e.g. "[dbo].[Fn_GetEmployeeName](UpdatedBy)") into a
        SourceExpression column, so you can see immediately what to go
        measure by hand instead of having to go find it in the procedure
        yourself.
        SQL error this predicts: "String or binary data would be truncated
        in table '...', column '...'"
        Flag: @Check_TruncationRisk

     7. Type mismatch: same pattern, declared column type family differs
        from the proc's live output type family.
        SQL error this predicts: "Conversion failed when converting the
        varchar value '...' to data type int" (or similar).
        Flag: @Check_TypeMismatch

     8. Procedures that could not be analyzed (not found, described with an
        error) or that contain IF/ELSE branches with separate SELECT
        statements -- their live shape may vary by branch in a way this (or
        any static) analysis cannot fully see, since
        sys.dm_exec_describe_first_result_set_for_object only reports ONE
        inferred shape per procedure. No SQL error by itself -- these need a
        human to double-check every branch.
        Flag: @Check_ProcsNeedingReview

     9. Templates this script's own text-parsing gave up on. No SQL error by
        itself -- means "review this FieldType_JSON_SQL value by hand, the
        diagnostic couldn't."
        Flag: @Check_UnparsedTemplates

     10. One-row summary of how many of each were found.
        Flag: @Check_Summary

 When to use:
   - After a user reports a dropdown/options error on My Details, bulk
     employee creation, or bulk profile update -- turn on only the flag that
     matches the error text you actually got (see the mapping above), run
     the script, and read that one result set.
   - Before/after changing any stored procedure that a FieldType_JSON_SQL
     row reuses via "INSERT INTO @Table EXEC <proc>", to catch shape drift
     before a user does -- turn on 5, 6, 7, 8.

 Inputs (set below, before running):
   @EmployerId                  -- NULL = scan all employers; set to one EmployerId to scope.
   @Check_UnresolvedParams      -- section 2
   @Check_PositionalPlaceholder -- section 3
   @Check_ColumnCountMismatch   -- section 5
   @Check_TruncationRisk        -- section 6
   @Check_TypeMismatch          -- section 7
   @Check_ProcsNeedingReview    -- section 8
   @Check_UnparsedTemplates     -- section 9
   @Check_Summary               -- section 10

 Read-only / write:
   READ-ONLY against real data -- TEmployeeDetail_Fields and TEmployeeDetail_Section
   are only ever SELECTed. This script creates and drops #local and session-scoped
   ##global temp tables in tempdb only (the ##global temp table is required to read
   back the shape of a dynamically-issued CREATE TABLE; see section 4b). No
   permanent object, and no row in any real table, is created, altered, or dropped.

 Known limitations (by design -- this is a best-effort text scan, not a real
 T-SQL parser):
   - Proc-name extraction assumes "EXEC ProcName" / "EXEC [ProcName]" /
     "EXEC dbo.ProcName", optionally schema-qualified with a bare "dbo."
     prefix. A bracket-qualified schema ("[dbo].[ProcName]") is not
     specifically unwrapped -- none of the FieldType_JSON_SQL text observed
     while writing this script used that form, but if a future row does,
     recheck section 9's "could not be parsed" output.
   - Only the FIRST "EXEC"/"EXECUTE" and the FIRST "... TABLE (...)" block in
     a given FieldType_JSON_SQL value are used. No row observed while writing
     this script declared more than one table variable or called more than
     one procedure via INSERT...EXEC; a row that did would need manual review
     (it will show up in section 9).
   - Declared-vs-actual comparison is POSITIONAL (by column ordinal), which
     matches how INSERT...EXEC actually binds -- not by column name.
   - The SourceExpression lookup (section 6) finds the FIRST occurrence of
     "... AS ColumnName ," or "... AS ColumnName FROM" in the procedure's
     text and walks backward (respecting parentheses) to the nearest
     top-level comma, capped at 400 characters of lookback. For a procedure
     with multiple branches reusing the same alias in more than one SELECT,
     this may show the wrong branch's expression -- treat it as a pointer to
     go verify, not a guaranteed-correct extraction. WITH ENCRYPTION
     procedures have no source text to search, so this is reported as
     unavailable for them (same reason section 8 can't review their
     branching either).
================================================================================
*/

SET NOCOUNT ON;

-- ============================================================
-- 0a. Inputs / working variables (all declared up front)
-- ============================================================
DECLARE @EmployerId INT = 10;   -- set to one EmployerId to scope the scan; NULL = all

DECLARE @TemplateId       INT;
DECLARE @Text             NVARCHAR(MAX);
DECLARE @Pos              INT;
DECLARE @Len              INT;
DECLARE @Depth            INT;
DECLARE @i                INT;
DECLARE @Ch               CHAR(1);
DECLARE @OpenPos          INT;
DECLARE @ClosePos         INT;
DECLARE @NameLen          INT;
DECLARE @ColDefText       NVARCHAR(MAX);
DECLARE @GlobalTableName  SYSNAME;
DECLARE @Sql              NVARCHAR(MAX);
DECLARE @ProcName         SYSNAME;
DECLARE @ProcObjectId     INT;
DECLARE @SourceSchema     SYSNAME;
DECLARE @SourceTable      SYSNAME;
DECLARE @SourceColumn     SYSNAME;
DECLARE @RealMaxLen       INT;
DECLARE @MeasureSql       NVARCHAR(MAX);
DECLARE @TargetColumnName SYSNAME;
DECLARE @Definition       NVARCHAR(MAX);
DECLARE @AliasPos         INT;
DECLARE @SearchPos        INT;
DECLARE @AliasTokenStart  INT;
DECLARE @AfterPos         INT;
DECLARE @EndPos           INT;
DECLARE @ExprStart        INT;
DECLARE @LookbackLimit    INT;
DECLARE @FoundAlias       BIT;
DECLARE @FoundComma       BIT;
DECLARE @ExtractedExpr    NVARCHAR(500);

-- ============================================================
-- 0b. Which result sets to run -- flip to 0 to hide one you don't need.
--     See the header above for which SQL error each flag corresponds to.
-- ============================================================
DECLARE @Check_UnresolvedParams      BIT = 0;  -- section 2
DECLARE @Check_PositionalPlaceholder BIT = 0;  -- section 3
DECLARE @Check_ColumnCountMismatch   BIT = 0;  -- section 5
DECLARE @Check_TruncationRisk        BIT = 1;  -- section 6
DECLARE @Check_TypeMismatch          BIT = 0;  -- section 7
DECLARE @Check_ProcsNeedingReview    BIT = 0;  -- section 8
DECLARE @Check_UnparsedTemplates     BIT = 0;  -- section 9
DECLARE @Check_Summary               BIT = 0;  -- section 10

-- Sections 5-10 all read from the shape-comparison prep in section 4, which
-- is the expensive part (cursors + dynamic SQL per template/proc). Skip that
-- prep entirely when none of the flags that need it are on.
DECLARE @NeedInsertExecPrep BIT =
    CASE WHEN @Check_ColumnCountMismatch = 1
           OR @Check_TruncationRisk      = 1
           OR @Check_TypeMismatch        = 1
           OR @Check_ProcsNeedingReview  = 1
           OR @Check_UnparsedTemplates   = 1
           OR @Check_Summary             = 1
         THEN 1 ELSE 0 END;

-- Parameter names the app layer actually supplies today
-- (ORM/Repositories/FieldRepository.js -> Features/Employee/BulkProfileUpdate/Utils/Helper.js:358-361)
DECLARE @KnownParams TABLE (ParamName SYSNAME PRIMARY KEY);
INSERT INTO @KnownParams (ParamName) VALUES ('EmployerId'), ('EmployeeId'), ('CountryId'), ('SectionId');
-- Relies on the database's default case-insensitive collation for the
-- ParamName comparisons below (observed to hold throughout this table).

-- ============================================================
-- 1. Candidate rows (exclude static JSON-literal option lists)
-- ============================================================
IF OBJECT_ID('tempdb..#Candidates') IS NOT NULL DROP TABLE #Candidates;
SELECT
    TF.FieldID, TF.FieldName, TF.SectionID, TS.Section, TF.EmployerID,
    TF.FieldType_JSON_SQL
INTO #Candidates
FROM TEmployeeDetail_Fields TF
JOIN TEmployeeDetail_Section TS ON TS.SectionID = TF.SectionID
WHERE TF.FieldType_JSON_SQL IS NOT NULL
  AND LEN(TF.FieldType_JSON_SQL) > 0
  AND TF.FieldType_JSON_SQL NOT LIKE '[[]%'
  AND (@EmployerId IS NULL OR TF.EmployerID = @EmployerId);

-- ============================================================
-- 2. Unresolved @Token parameters -> "Must declare the scalar variable"
-- ============================================================
IF @Check_UnresolvedParams = 1
BEGIN
    IF OBJECT_ID('tempdb..#Numbers') IS NOT NULL DROP TABLE #Numbers;
    SELECT TOP (8000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
    INTO #Numbers
    FROM sys.all_objects a CROSS JOIN sys.all_objects b;

    IF OBJECT_ID('tempdb..#ParamTokens') IS NOT NULL DROP TABLE #ParamTokens;
    SELECT
        c.FieldID, c.FieldName, c.Section, c.EmployerID,
        SUBSTRING(c.FieldType_JSON_SQL, n.n,
            PATINDEX('%[^A-Za-z0-9_]%', SUBSTRING(c.FieldType_JSON_SQL, n.n + 1, 4000) + ' ')
        ) AS ParamToken
    INTO #ParamTokens
    FROM #Candidates c
    JOIN #Numbers n ON n.n <= LEN(c.FieldType_JSON_SQL)
    WHERE SUBSTRING(c.FieldType_JSON_SQL, n.n, 1) = '@';

    PRINT '--- 2. Unresolved parameter tokens (-> Must declare the scalar variable) ---';
    SELECT DISTINCT
        'Unresolved parameter' AS IssueType,
        pt.FieldID, pt.FieldName, pt.Section, pt.EmployerID,
        pt.ParamToken,
        'App layer only ever supplies EmployerId/EmployeeId/CountryId/SectionId; this token is left as literal text and SQL Server will throw Must declare the scalar variable.' AS Detail
    FROM #ParamTokens pt
    LEFT JOIN @KnownParams kp ON kp.ParamName = SUBSTRING(pt.ParamToken, 2, 128)
    WHERE kp.ParamName IS NULL
    ORDER BY pt.FieldID;

    DROP TABLE #Numbers, #ParamTokens;
END;

-- ============================================================
-- 3. "?" positional placeholder rows
-- ============================================================
IF @Check_PositionalPlaceholder = 1
BEGIN
    PRINT '--- 3. Positional "?" placeholder rows (always bound to employerId) ---';
    SELECT
        'Positional "?" placeholder' AS IssueType,
        FieldID, FieldName, Section, EmployerID,
        'Always substituted with employerId by app code regardless of which column the "?" sits next to -- confirm this row''s "?" really means EmployerID.' AS Detail
    FROM #Candidates
    WHERE FieldType_JSON_SQL LIKE '%?%'
    ORDER BY FieldID;
END;

-- ============================================================
-- 4. INSERT INTO @TableVar EXEC <proc> contract checks
--    (prep only -- runs when any of sections 5-10 need it; see @NeedInsertExecPrep)
-- ============================================================
IF @NeedInsertExecPrep = 1
BEGIN
    -- 4a. Reduce to distinct templates (the same text repeats once per employer)
    IF OBJECT_ID('tempdb..#Templates') IS NOT NULL DROP TABLE #Templates;
    SELECT
        ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS TemplateId,
        FieldType_JSON_SQL,
        MIN(FieldID)   AS SampleFieldID,
        MIN(FieldName) AS FieldName,
        COUNT(*)       AS AffectedRowCount,
        CAST(NULL AS SYSNAME)       AS ProcName,
        CAST(NULL AS NVARCHAR(MAX)) AS ColumnDefText
    INTO #Templates
    FROM #Candidates
    WHERE FieldType_JSON_SQL LIKE '%TABLE%'
      AND (FieldType_JSON_SQL LIKE '%EXEC%' OR FieldType_JSON_SQL LIKE '%EXECUTE%')
    GROUP BY FieldType_JSON_SQL;

    -- 4b. Per template: extract the target proc name and the declared column-list text.
    -- Cursors are fine here -- this walks a few dozen distinct dynamic-query
    -- *templates* (deduplicated text), not per-row production data.
    DECLARE tmpl_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT TemplateId, FieldType_JSON_SQL FROM #Templates;
    OPEN tmpl_cursor;
    FETCH NEXT FROM tmpl_cursor INTO @TemplateId, @Text;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- ---- locate the proc name after EXEC / EXECUTE ----
        SET @Pos = PATINDEX('%[Ee][Xx][Ee][Cc]%', @Text);
        IF @Pos > 0
        BEGIN
            SET @Pos = @Pos + 4;                                            -- past "EXEC"
            IF UPPER(SUBSTRING(@Text, @Pos, 3)) = 'UTE' SET @Pos = @Pos + 3; -- past "UTE" of "EXECUTE"
            WHILE SUBSTRING(@Text, @Pos, 1) IN (' ', CHAR(13), CHAR(10), CHAR(9))
                SET @Pos = @Pos + 1;
            IF UPPER(SUBSTRING(@Text, @Pos, 4)) = 'DBO.' SET @Pos = @Pos + 4;
            IF SUBSTRING(@Text, @Pos, 1) = '[' SET @Pos = @Pos + 1;

            SET @NameLen = PATINDEX('%[^A-Za-z0-9_]%', SUBSTRING(@Text, @Pos, 128) + ' ') - 1;
            IF @NameLen >= 1
                UPDATE #Templates SET ProcName = SUBSTRING(@Text, @Pos, @NameLen) WHERE TemplateId = @TemplateId;
        END;

        -- ---- locate the DECLARE ... TABLE ( ... ) column-list text ----
        SET @Pos = PATINDEX('%[Tt][Aa][Bb][Ll][Ee]%', @Text);
        IF @Pos > 0
        BEGIN
            SET @OpenPos = CHARINDEX('(', @Text, @Pos);
            IF @OpenPos > 0
            BEGIN
                SET @Depth = 1;
                SET @i = @OpenPos + 1;
                SET @Len = LEN(@Text);
                WHILE @Depth > 0 AND @i <= @Len
                BEGIN
                    SET @Ch = SUBSTRING(@Text, @i, 1);
                    IF @Ch = '(' SET @Depth = @Depth + 1;
                    IF @Ch = ')' SET @Depth = @Depth - 1;
                    SET @i = @i + 1;
                END;
                SET @ClosePos = @i - 1;
                IF @Depth = 0
                    UPDATE #Templates
                    SET ColumnDefText = SUBSTRING(@Text, @OpenPos, @ClosePos - @OpenPos + 1)
                    WHERE TemplateId = @TemplateId;
            END;
        END;

        FETCH NEXT FROM tmpl_cursor INTO @TemplateId, @Text;
    END;
    CLOSE tmpl_cursor;
    DEALLOCATE tmpl_cursor;

    -- 4c. Resolve the DECLARED shape for each template by letting SQL Server's own
    -- DDL parser read it, instead of hand-rolling a column/type tokenizer.
    -- A *global* temp table is required (not #local): objects created inside an
    -- EXEC(...) batch are dropped the moment that EXEC returns, so a #local temp
    -- table created this way is invisible to the rest of this script.
    IF OBJECT_ID('tempdb..#DeclaredColumns') IS NOT NULL DROP TABLE #DeclaredColumns;
    CREATE TABLE #DeclaredColumns
    (
        TemplateId          INT,
        Ordinal             INT,
        ColumnName          SYSNAME,
        TypeName            SYSNAME,
        DeclaredLengthChars INT NULL,   -- NULL = not a length-bearing type; -1 = MAX
        IsUnicode           BIT
    );

    DECLARE tmpl_cursor2 CURSOR LOCAL FAST_FORWARD FOR
        SELECT TemplateId, ColumnDefText FROM #Templates WHERE ColumnDefText IS NOT NULL;
    OPEN tmpl_cursor2;
    FETCH NEXT FROM tmpl_cursor2 INTO @TemplateId, @ColDefText;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @GlobalTableName = N'##FieldsDiag_ParsedShape_' + CAST(@@SPID AS NVARCHAR(10));

        BEGIN TRY
            SET @Sql = N'IF OBJECT_ID(''tempdb..' + @GlobalTableName + N''') IS NOT NULL DROP TABLE ' + @GlobalTableName + N';
                         CREATE TABLE ' + @GlobalTableName + N' ' + @ColDefText;
            EXEC (@Sql);

            INSERT INTO #DeclaredColumns (TemplateId, Ordinal, ColumnName, TypeName, DeclaredLengthChars, IsUnicode)
            SELECT
                @TemplateId,
                c.column_id,
                c.name,
                ty.name,
                CASE WHEN c.max_length = -1 THEN -1
                     WHEN ty.name IN ('nvarchar', 'nchar') THEN c.max_length / 2
                     WHEN ty.name IN ('varchar', 'char')   THEN c.max_length
                     ELSE NULL END,
                CASE WHEN ty.name IN ('nvarchar', 'nchar', 'ntext') THEN 1 ELSE 0 END
            FROM tempdb.sys.columns c
            JOIN tempdb.sys.types ty ON ty.user_type_id = c.user_type_id
            WHERE c.object_id = OBJECT_ID('tempdb..' + @GlobalTableName)
            ORDER BY c.column_id;

            SET @Sql = N'DROP TABLE ' + @GlobalTableName;
            EXEC (@Sql);
        END TRY
        BEGIN CATCH
            INSERT INTO #DeclaredColumns (TemplateId, Ordinal, ColumnName, TypeName, DeclaredLengthChars, IsUnicode)
            VALUES (@TemplateId, 0, '<<PARSE FAILED: ' + LEFT(ERROR_MESSAGE(), 200) + '>>', '', NULL, 0);
        END CATCH;

        FETCH NEXT FROM tmpl_cursor2 INTO @TemplateId, @ColDefText;
    END;
    CLOSE tmpl_cursor2;
    DEALLOCATE tmpl_cursor2;

    -- 4d. Resolve the ACTUAL live shape of each distinct target procedure.
    IF OBJECT_ID('tempdb..#TargetProcs') IS NOT NULL DROP TABLE #TargetProcs;
    SELECT DISTINCT
        ProcName,
        OBJECT_ID(ProcName) AS ProcObjectId,
        CAST(NULL AS BIT) AS IsEncrypted,
        CAST(NULL AS BIT) AS HasConditionalBranching,
        CAST(NULL AS NVARCHAR(MAX)) AS Definition
    INTO #TargetProcs
    FROM #Templates
    WHERE ProcName IS NOT NULL;

    UPDATE tp
    SET IsEncrypted = ISNULL(OBJECTPROPERTY(tp.ProcObjectId, 'IsEncrypted'), 0),
        -- best-effort heuristic: an IF ... BEGIN ... SELECT ... ELSE ... SELECT
        -- shape strongly suggests the result set can differ by branch, which
        -- sys.dm_exec_describe_first_result_set_for_object will not fully reveal.
        HasConditionalBranching =
            CASE WHEN sm.definition LIKE '%[Ii][Ff]%[Bb][Ee][Gg][Ii][Nn]%[Ss][Ee][Ll][Ee][Cc][Tt]%[Ee][Ll][Ss][Ee]%[Ss][Ee][Ll][Ee][Cc][Tt]%'
                 THEN 1 ELSE 0 END,
        Definition = sm.definition   -- reused below (section 4f) to locate expression-derived columns' source text
    FROM #TargetProcs tp
    LEFT JOIN sys.sql_modules sm ON sm.object_id = tp.ProcObjectId;

    IF OBJECT_ID('tempdb..#ActualColumns') IS NOT NULL DROP TABLE #ActualColumns;
    CREATE TABLE #ActualColumns
    (
        ProcName       SYSNAME,
        Ordinal        INT,
        ColumnName     SYSNAME     NULL,
        TypeName       SYSNAME     NULL,
        MaxLengthBytes INT         NULL,
        SourceSchema   SYSNAME     NULL,   -- populated only when the DMV can trace this
        SourceTable    SYSNAME     NULL,   -- output column to a single real table column
        SourceColumn   SYSNAME     NULL,   -- (NULL for expression/function-derived columns)
        ErrorMessage   NVARCHAR(400) NULL
    );

    DECLARE proc_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT ProcName, ProcObjectId FROM #TargetProcs WHERE ProcObjectId IS NOT NULL;
    OPEN proc_cursor;
    FETCH NEXT FROM proc_cursor INTO @ProcName, @ProcObjectId;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            INSERT INTO #ActualColumns (ProcName, Ordinal, ColumnName, TypeName, MaxLengthBytes, SourceSchema, SourceTable, SourceColumn, ErrorMessage)
            SELECT
                @ProcName,
                r.column_ordinal,
                r.name,
                r.system_type_name,
                r.max_length,
                r.source_schema,
                r.source_table,
                r.source_column,
                CASE WHEN r.error_number IS NOT NULL THEN r.error_message ELSE NULL END
            FROM sys.dm_exec_describe_first_result_set_for_object(@ProcObjectId, 0) r;
        END TRY
        BEGIN CATCH
            INSERT INTO #ActualColumns (ProcName, Ordinal, ErrorMessage)
            VALUES (@ProcName, 0, ERROR_MESSAGE());
        END CATCH;

        FETCH NEXT FROM proc_cursor INTO @ProcName, @ProcObjectId;
    END;
    CLOSE proc_cursor;
    DEALLOCATE proc_cursor;

    -- 4e. Where a column traces back to a single real table column, measure
    -- its REAL current MAX(LEN(...)) -- this is what actually determines
    -- whether truncation happens today, as opposed to what the column's
    -- declared TYPE would allow in the worst case.
    IF @Check_TruncationRisk = 1
    BEGIN
        IF OBJECT_ID('tempdb..#RealMaxLengths') IS NOT NULL DROP TABLE #RealMaxLengths;
        CREATE TABLE #RealMaxLengths
        (
            SourceSchema       SYSNAME,
            SourceTable        SYSNAME,
            SourceColumn       SYSNAME,
            RealMaxLengthChars INT NULL,
            ErrorMessage       NVARCHAR(400) NULL,
            PRIMARY KEY (SourceSchema, SourceTable, SourceColumn)
        );

        DECLARE source_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT DISTINCT SourceSchema, SourceTable, SourceColumn
            FROM #ActualColumns
            WHERE SourceSchema IS NOT NULL AND SourceTable IS NOT NULL AND SourceColumn IS NOT NULL;
        OPEN source_cursor;
        FETCH NEXT FROM source_cursor INTO @SourceSchema, @SourceTable, @SourceColumn;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            BEGIN TRY
                -- MAX(LEN(...)) across the WHOLE source table, not scoped to one
                -- employer -- this template is reused by every employer that has
                -- a row pointing at it, so the relevant worst case is the max
                -- across all of them, not just the one @EmployerId this run scoped to.
                SET @MeasureSql = N'SELECT @LenOut = MAX(LEN(' + QUOTENAME(@SourceColumn) + N')) FROM '
                                 + QUOTENAME(@SourceSchema) + N'.' + QUOTENAME(@SourceTable);
                EXEC sp_executesql @MeasureSql, N'@LenOut INT OUTPUT', @LenOut = @RealMaxLen OUTPUT;

                INSERT INTO #RealMaxLengths (SourceSchema, SourceTable, SourceColumn, RealMaxLengthChars)
                VALUES (@SourceSchema, @SourceTable, @SourceColumn, @RealMaxLen);
            END TRY
            BEGIN CATCH
                INSERT INTO #RealMaxLengths (SourceSchema, SourceTable, SourceColumn, ErrorMessage)
                VALUES (@SourceSchema, @SourceTable, @SourceColumn, ERROR_MESSAGE());
            END CATCH;

            FETCH NEXT FROM source_cursor INTO @SourceSchema, @SourceTable, @SourceColumn;
        END;
        CLOSE source_cursor;
        DEALLOCATE source_cursor;

        -- 4f. For columns that COULDN'T be traced to a source table (expression/
        -- function results), make a best-effort attempt to locate the actual
        -- expression in the procedure's own source text, so it shows up right
        -- next to the NULL SourceTable/SourceColumn instead of requiring a
        -- manual hunt through the procedure. See the header's "Known
        -- limitations" for exactly how this search works and where it can miss.
        IF OBJECT_ID('tempdb..#UnresolvedExpressions') IS NOT NULL DROP TABLE #UnresolvedExpressions;
        CREATE TABLE #UnresolvedExpressions
        (
            ProcName         SYSNAME,
            ColumnName       SYSNAME,
            SourceExpression NVARCHAR(500) NULL,
            Note             NVARCHAR(200) NULL,
            PRIMARY KEY (ProcName, ColumnName)
        );

        DECLARE unresolved_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT DISTINCT ac.ProcName, ac.ColumnName, tp.Definition
            FROM #ActualColumns ac
            JOIN #TargetProcs tp ON tp.ProcName = ac.ProcName
            WHERE ac.SourceTable IS NULL AND ac.ColumnName IS NOT NULL AND ac.ErrorMessage IS NULL;
        OPEN unresolved_cursor;
        FETCH NEXT FROM unresolved_cursor INTO @ProcName, @TargetColumnName, @Definition;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            BEGIN TRY
                IF @Definition IS NULL
                BEGIN
                    INSERT INTO #UnresolvedExpressions (ProcName, ColumnName, Note)
                    VALUES (@ProcName, @TargetColumnName, 'WITH ENCRYPTION -- source text unavailable, cannot locate the expression automatically.');
                END;
                ELSE
                BEGIN
                    SET @SearchPos  = 1;
                    SET @FoundAlias = 0;

                    WHILE @FoundAlias = 0 AND @SearchPos <= LEN(@Definition)
                    BEGIN
                        SET @AliasPos = CHARINDEX(@TargetColumnName, @Definition, @SearchPos);
                        IF @AliasPos = 0 BREAK;

                        -- word-boundary check: '[' and ']' (bracketed alias forms) already
                        -- satisfy "not an identifier character", so no special-casing needed.
                        IF (@AliasPos = 1 OR SUBSTRING(@Definition, @AliasPos - 1, 1) NOT LIKE '[A-Za-z0-9_]')
                           AND SUBSTRING(@Definition + ' ', @AliasPos + LEN(@TargetColumnName), 1) NOT LIKE '[A-Za-z0-9_]'
                        BEGIN
                            SET @AfterPos = @AliasPos + LEN(@TargetColumnName);
                            SET @EndPos   = @AfterPos;
                            IF SUBSTRING(@Definition, @EndPos, 1) = ']' SET @EndPos = @EndPos + 1;

                            SET @i = @EndPos;
                            WHILE SUBSTRING(@Definition, @i, 1) IN (' ', CHAR(13), CHAR(10), CHAR(9))
                                SET @i = @i + 1;

                            -- only treat this occurrence as a trailing "expr AS Alias" if a
                            -- comma or FROM immediately follows -- i.e. it's genuinely the last
                            -- thing in a SELECT-list item, not some unrelated use of the same word.
                            IF SUBSTRING(@Definition, @i, 1) = ',' OR UPPER(SUBSTRING(@Definition, @i, 4)) = 'FROM'
                            BEGIN
                                SET @FoundAlias = 1;

                                SET @AliasTokenStart = @AliasPos;
                                IF SUBSTRING(@Definition, @AliasPos - 1, 1) = '[' SET @AliasTokenStart = @AliasPos - 1;

                                SET @LookbackLimit = @AliasTokenStart - 400;
                                IF @LookbackLimit < 1 SET @LookbackLimit = 1;

                                SET @Depth      = 0;
                                SET @FoundComma = 0;
                                SET @i = @AliasTokenStart - 1;
                                WHILE @i >= @LookbackLimit
                                BEGIN
                                    SET @Ch = SUBSTRING(@Definition, @i, 1);
                                    IF @Ch = ')' SET @Depth = @Depth + 1;
                                    IF @Ch = '(' SET @Depth = @Depth - 1;
                                    IF @Depth <= 0 AND @Ch = ','
                                    BEGIN
                                        SET @ExprStart  = @i + 1;
                                        SET @FoundComma = 1;
                                        BREAK;
                                    END;
                                    SET @i = @i - 1;
                                END;
                                IF @FoundComma = 0 SET @ExprStart = @LookbackLimit;

                                SET @ExtractedExpr = LTRIM(RTRIM(SUBSTRING(@Definition, @ExprStart, @EndPos - @ExprStart)));
                                SET @ExtractedExpr = REPLACE(REPLACE(REPLACE(@ExtractedExpr, CHAR(13), ' '), CHAR(10), ' '), CHAR(9), ' ');
                                WHILE @ExtractedExpr LIKE '%  %' SET @ExtractedExpr = REPLACE(@ExtractedExpr, '  ', ' ');
                                IF @FoundComma = 0 SET @ExtractedExpr = '...' + @ExtractedExpr;
                                IF LEN(@ExtractedExpr) > 300 SET @ExtractedExpr = LEFT(@ExtractedExpr, 300) + '...';

                                INSERT INTO #UnresolvedExpressions (ProcName, ColumnName, SourceExpression)
                                VALUES (@ProcName, @TargetColumnName, @ExtractedExpr);
                            END;
                        END;

                        SET @SearchPos = @AliasPos + 1;
                    END;

                    IF @FoundAlias = 0
                        INSERT INTO #UnresolvedExpressions (ProcName, ColumnName, Note)
                        VALUES (@ProcName, @TargetColumnName, 'Best-effort text search could not locate this alias as a trailing "expr AS Alias" in the procedure text -- check the procedure manually.');
                END;
            END TRY
            BEGIN CATCH
                INSERT INTO #UnresolvedExpressions (ProcName, ColumnName, Note)
                VALUES (@ProcName, @TargetColumnName, 'Expression lookup failed: ' + ERROR_MESSAGE());
            END CATCH;

            FETCH NEXT FROM unresolved_cursor INTO @ProcName, @TargetColumnName, @Definition;
        END;
        CLOSE unresolved_cursor;
        DEALLOCATE unresolved_cursor;
    END;
END;

-- ============================================================
-- 5. Column-count mismatch (CRITICAL -- INSERT...EXEC fails outright)
-- ============================================================
IF @Check_ColumnCountMismatch = 1
BEGIN
    PRINT '--- 5. Column count mismatch (INSERT...EXEC fails outright) ---';
    ;WITH DeclaredCounts AS (
        SELECT TemplateId, COUNT(*) AS DeclaredCount
        FROM #DeclaredColumns
        WHERE ColumnName NOT LIKE '<<PARSE FAILED%'
        GROUP BY TemplateId
    ),
    ActualCounts AS (
        SELECT tp.ProcName, COUNT(*) AS ActualCount
        FROM #ActualColumns ac
        JOIN #TargetProcs tp ON tp.ProcName = ac.ProcName
        WHERE ac.ErrorMessage IS NULL
        GROUP BY tp.ProcName
    )
    SELECT
        'Column count mismatch' AS IssueType,
        t.SampleFieldID, t.FieldName, t.AffectedRowCount, t.ProcName,
        dc.DeclaredCount, ac.ActualCount,
        'INSERT INTO @Table EXEC fails outright when the procedure''s current result set has a different column count than declared. Check EVERY IF/ELSE branch in the procedure, not just the one this diagnostic happened to see.' AS Detail
    FROM #Templates t
    JOIN DeclaredCounts dc ON dc.TemplateId = t.TemplateId
    JOIN ActualCounts   ac ON ac.ProcName   = t.ProcName
    WHERE dc.DeclaredCount <> ac.ActualCount
    ORDER BY t.AffectedRowCount DESC;
END;

-- ============================================================
-- 6. Truncation risk (declared narrower than live source, or source is MAX)
-- ============================================================
IF @Check_TruncationRisk = 1
BEGIN
    PRINT '--- 6. Truncation risk ---';
    SELECT
        'Truncation risk' AS IssueType,
        t.SampleFieldID, t.FieldName, t.AffectedRowCount, t.ProcName,
        dcol.Ordinal,
        dcol.ColumnName AS DeclaredColumnName,
        dcol.TypeName   AS DeclaredType,
        dcol.DeclaredLengthChars,
        acol.ColumnName AS ActualColumnName,
        acol.TypeName   AS ActualType,
        acol.MaxLengthBytes AS ActualTypeCeilingBytes,
        acol.SourceTable, acol.SourceColumn,
        ue.SourceExpression,
        rml.RealMaxLengthChars,
        CASE
            WHEN acol.SourceTable IS NULL AND ue.SourceExpression IS NOT NULL
                THEN 'CANNOT VERIFY REAL LENGTH AUTOMATICALLY -- expression-derived column, see SourceExpression. Measure it by hand, e.g. SELECT MAX(LEN(<that expression>)) FROM <its base table>.'
            WHEN acol.SourceTable IS NULL
                THEN 'CANNOT VERIFY AUTOMATICALLY -- expression/function-derived column, and this script could not even locate its source text automatically (' + ISNULL(ue.Note, 'unknown reason') + '). Check the procedure by hand.'
            WHEN rml.ErrorMessage IS NOT NULL
                THEN 'Could not measure the real source data: ' + rml.ErrorMessage
            WHEN dcol.DeclaredLengthChars <> -1 AND rml.RealMaxLengthChars > dcol.DeclaredLengthChars
                THEN 'FAILING TODAY -- real data already reaches ' + CAST(rml.RealMaxLengthChars AS VARCHAR(10))
                     + ' char(s), which exceeds the declared ' + CAST(dcol.DeclaredLengthChars AS VARCHAR(10))
                     + '-char sink by ' + CAST(rml.RealMaxLengthChars - dcol.DeclaredLengthChars AS VARCHAR(10)) + ' char(s).'
            ELSE 'Safe today -- real data currently reaches ' + CAST(ISNULL(rml.RealMaxLengthChars, 0) AS VARCHAR(10))
                     + ' char(s); declared sink allows '
                     + CASE WHEN dcol.DeclaredLengthChars = -1 THEN 'MAX' ELSE CAST(dcol.DeclaredLengthChars AS VARCHAR(10)) END
                     + '. Still worth widening if the source column''s type allows growth beyond that (see ActualTypeCeilingBytes).'
        END AS Verdict
    FROM #Templates t
    JOIN #DeclaredColumns dcol ON dcol.TemplateId = t.TemplateId
    JOIN #ActualColumns   acol ON acol.ProcName = t.ProcName AND acol.Ordinal = dcol.Ordinal
    LEFT JOIN #RealMaxLengths rml
        ON rml.SourceSchema = acol.SourceSchema
       AND rml.SourceTable  = acol.SourceTable
       AND rml.SourceColumn = acol.SourceColumn
    LEFT JOIN #UnresolvedExpressions ue
        ON ue.ProcName = acol.ProcName
       AND ue.ColumnName = acol.ColumnName
    WHERE dcol.DeclaredLengthChars IS NOT NULL
      AND dcol.DeclaredLengthChars <> -1     -- a MAX-declared sink can never be too narrow, regardless of the source's type
      AND acol.ErrorMessage IS NULL
      AND (
            acol.MaxLengthBytes = -1
            OR dcol.DeclaredLengthChars * CASE WHEN dcol.IsUnicode = 1 THEN 2 ELSE 1 END < acol.MaxLengthBytes
          )
    ORDER BY t.AffectedRowCount DESC;
END;

-- ============================================================
-- 7. Type-category mismatch (e.g. declared INT receiving a string result)
-- ============================================================
IF @Check_TypeMismatch = 1
BEGIN
    PRINT '--- 7. Type-category mismatch ---';
    SELECT
        'Type mismatch' AS IssueType,
        t.SampleFieldID, t.FieldName, t.AffectedRowCount, t.ProcName,
        dcol.Ordinal,
        dcol.ColumnName AS DeclaredColumnName, dcol.TypeName AS DeclaredType,
        acol.ColumnName AS ActualColumnName,   acol.TypeName AS ActualType,
        'Declared column type and the procedure''s actual output type are in different families -- conversion may fail at runtime depending on the actual values (e.g. a resolved name string landing in an INT column).' AS Detail
    FROM #Templates t
    JOIN #DeclaredColumns dcol ON dcol.TemplateId = t.TemplateId
    JOIN #ActualColumns   acol ON acol.ProcName = t.ProcName AND acol.Ordinal = dcol.Ordinal
    WHERE acol.ErrorMessage IS NULL
      AND (
            (dcol.TypeName IN ('int', 'bigint', 'smallint', 'tinyint', 'bit', 'decimal', 'numeric', 'float', 'money')
             AND acol.TypeName IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext'))
         OR (dcol.TypeName IN ('datetime', 'date', 'datetime2', 'smalldatetime', 'time')
             AND acol.TypeName IN ('varchar', 'nvarchar', 'char', 'nchar'))
          )
    ORDER BY t.AffectedRowCount DESC;
END;

-- ============================================================
-- 8. Procedures needing manual review (encrypted / unanalyzable / branching)
-- ============================================================
IF @Check_ProcsNeedingReview = 1
BEGIN
    PRINT '--- 8. Procs needing manual review ---';
    SELECT
        tp.ProcName,
        tp.IsEncrypted,
        tp.HasConditionalBranching,
        CASE
            WHEN tp.ProcObjectId IS NULL THEN 'Procedure not found by this extracted name -- re-check parsing for this template (see section 9).'
            WHEN EXISTS (SELECT 1 FROM #ActualColumns ac WHERE ac.ProcName = tp.ProcName AND ac.ErrorMessage IS NOT NULL)
                THEN (SELECT TOP 1 ErrorMessage FROM #ActualColumns ac WHERE ac.ProcName = tp.ProcName AND ac.ErrorMessage IS NOT NULL)
            WHEN tp.HasConditionalBranching = 1
                THEN 'Procedure has IF/ELSE branches with separate SELECTs -- this diagnostic only sees ONE inferred shape; review every branch manually (this is how a column-count mismatch can hide from the automated checks above).'
            WHEN tp.IsEncrypted = 1
                THEN 'WITH ENCRYPTION -- shape was still checked via sys.dm_exec_describe_first_result_set_for_object, but the source text could not be reviewed for branching.'
            ELSE NULL
        END AS ReviewReason
    FROM #TargetProcs tp
    WHERE tp.ProcObjectId IS NULL
       OR EXISTS (SELECT 1 FROM #ActualColumns ac WHERE ac.ProcName = tp.ProcName AND ac.ErrorMessage IS NOT NULL)
       OR tp.HasConditionalBranching = 1
       OR tp.IsEncrypted = 1
    ORDER BY tp.ProcName;
END;

-- ============================================================
-- 9. Templates this diagnostic could not fully parse (manual review)
-- ============================================================
IF @Check_UnparsedTemplates = 1
BEGIN
    PRINT '--- 9. Templates not fully parsed by this script ---';
    SELECT
        t.TemplateId, t.SampleFieldID, t.FieldName, t.AffectedRowCount, t.ProcName,
        CASE WHEN t.ColumnDefText IS NULL THEN 'Could not locate a DECLARE ... TABLE (...) column list'
             WHEN t.ProcName IS NULL THEN 'Could not locate an EXEC/EXECUTE target procedure name'
             ELSE 'CREATE TABLE re-parse of the extracted column list failed -- see #DeclaredColumns for the error' END AS ParseIssue
    FROM #Templates t
    WHERE t.ProcName IS NULL
       OR t.ColumnDefText IS NULL
       OR EXISTS (SELECT 1 FROM #DeclaredColumns dc WHERE dc.TemplateId = t.TemplateId AND dc.ColumnName LIKE '<<PARSE FAILED%')
    ORDER BY t.AffectedRowCount DESC;
END;

-- ============================================================
-- 10. Summary counts
-- ============================================================
IF @Check_Summary = 1
BEGIN
    PRINT '--- 10. Summary ---';
    SELECT
        (SELECT COUNT(*) FROM #Candidates)                                    AS CandidateRowsScanned,
        (SELECT COUNT(*) FROM #Templates)                                     AS InsertExecTemplatesFound,
        (SELECT COUNT(DISTINCT ProcName) FROM #TargetProcs)                   AS DistinctTargetProcsFound,
        (SELECT COUNT(*) FROM #TargetProcs WHERE IsEncrypted = 1)             AS EncryptedProcsFound,
        (SELECT COUNT(*) FROM #TargetProcs WHERE HasConditionalBranching = 1) AS BranchingProcsFound;
END;

-- ============================================================
-- Cleanup (each guarded -- a table only exists if its owning section ran)
-- ============================================================
IF OBJECT_ID('tempdb..#Candidates')      IS NOT NULL DROP TABLE #Candidates;
IF OBJECT_ID('tempdb..#Templates')       IS NOT NULL DROP TABLE #Templates;
IF OBJECT_ID('tempdb..#DeclaredColumns') IS NOT NULL DROP TABLE #DeclaredColumns;
IF OBJECT_ID('tempdb..#TargetProcs')     IS NOT NULL DROP TABLE #TargetProcs;
IF OBJECT_ID('tempdb..#ActualColumns')   IS NOT NULL DROP TABLE #ActualColumns;
IF OBJECT_ID('tempdb..#RealMaxLengths')  IS NOT NULL DROP TABLE #RealMaxLengths;
IF OBJECT_ID('tempdb..#UnresolvedExpressions') IS NOT NULL DROP TABLE #UnresolvedExpressions;
