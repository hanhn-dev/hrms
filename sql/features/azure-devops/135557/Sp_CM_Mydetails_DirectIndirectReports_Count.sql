CREATE OR ALTER PROCEDURE [dbo].[Sp_CM_Mydetails_DirectIndirectReports_Count]
(
    @EmployeeId INT,
    @RankLevel INT,
    @IsActive CHAR(1) = NULL,
    @EmployerId INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @lv_Hierarchy TABLE
    (
        EmployeeId INT,
        RankLevel INT
    );

    DECLARE @lv_HierarchyFun TABLE
    (
        EmployeeId INT,
        RankLevel INT
    );

    DECLARE @lv_Result TABLE
    (
        EmployeeId INT PRIMARY KEY
    );

    DECLARE @lv_LevelCounter INT = 1;
    DECLARE @lv_LevelCounterFun INT = 1;
    DECLARE @lv_EmployeeCount INT = 0;
    DECLARE @lv_EmployeeCountFun INT = 0;
    DECLARE @Lv_RoleName VARCHAR(100);
    DECLARE @Lv_EmployerId INT;

    IF (@IsActive = '')
    BEGIN
        SELECT @IsActive = NULL;
    END;

    IF @EmployerId IS NULL
    BEGIN
        SELECT
            @Lv_EmployerId = EmployerId
        FROM TEmployee
        WHERE EmployeeId = @EmployeeId;
    END;
    ELSE
    BEGIN
        SET @Lv_EmployerId = @EmployerId;
    END;

    INSERT INTO @lv_Hierarchy
    VALUES
    (
        @EmployeeId,
        0
    );

    IF @RankLevel <> -1
    BEGIN
        SET @lv_EmployeeCount = 1;

        WHILE (@lv_EmployeeCount > 0)
        BEGIN
            INSERT INTO @lv_Hierarchy
            SELECT
                O.EmployeeId,
                @lv_LevelCounter
            FROM TORGChart O
            INNER JOIN TEmployee TE
                ON TE.EmployeeId = O.EmployeeId
                AND TE.IsActive = 'Y'
            WHERE O.ReportsTo IN
            (
                SELECT EmployeeId
                FROM @lv_Hierarchy
                WHERE RankLevel = @lv_LevelCounter - 1
            )
            AND O.ReportsTo <> O.EmployeeId
            AND O.EmployeeId NOT IN
            (
                SELECT EmployeeId
                FROM @lv_Hierarchy
            );

            SELECT
                @lv_EmployeeCount = COUNT(1)
            FROM TORGChart O
            INNER JOIN TEmployee TE
                ON TE.EmployeeId = O.EmployeeId
                AND TE.IsActive = 'Y'
            WHERE O.ReportsTo IN
            (
                SELECT EmployeeId
                FROM @lv_Hierarchy
                WHERE RankLevel = @lv_LevelCounter
            )
            AND O.ReportsTo <> O.EmployeeId;

            SET @lv_LevelCounter = @lv_LevelCounter + 1;

            IF @RankLevel = 0
            BEGIN
                BREAK;
            END;
        END;
    END;

    INSERT INTO @lv_HierarchyFun
    VALUES
    (
        @EmployeeId,
        0
    );

    IF @RankLevel <> -1
    BEGIN
        SET @lv_EmployeeCountFun = 1;

        WHILE (@lv_EmployeeCountFun > 0)
        BEGIN
            INSERT INTO @lv_HierarchyFun
            SELECT
                O.EmployeeId,
                @lv_LevelCounterFun
            FROM TEmployeeInfo O
            INNER JOIN TEmployee TE
                ON TE.EmployeeId = O.EmployeeId
                AND TE.IsActive = 'Y'
            WHERE O.FunctionalManager IN
            (
                SELECT EmployeeId
                FROM @lv_HierarchyFun
                WHERE RankLevel = @lv_LevelCounterFun - 1
            )
            AND O.EmployeeId <> O.FunctionalManager
            AND O.EmployeeId NOT IN
            (
                SELECT EmployeeId
                FROM @lv_HierarchyFun
            );

            SELECT
                @lv_EmployeeCountFun = COUNT(1)
            FROM TEmployeeInfo O
            INNER JOIN TEmployee TE
                ON TE.EmployeeId = O.EmployeeId
                AND TE.IsActive = 'Y'
            WHERE O.FunctionalManager IN
            (
                SELECT EmployeeId
                FROM @lv_HierarchyFun
                WHERE RankLevel = @lv_LevelCounterFun
            )
            AND O.EmployeeId <> O.FunctionalManager;

            SET @lv_LevelCounterFun = @lv_LevelCounterFun + 1;

            IF @RankLevel = 0
            BEGIN
                BREAK;
            END;
        END;
    END;

    SELECT
        @Lv_RoleName = dbo.FN_GetRoleName
        (
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

    IF @RankLevel = -1
    BEGIN
        INSERT INTO @lv_Result
        (
            EmployeeId
        )
        SELECT
            E.EmployeeId
        FROM TEmployee E
        INNER JOIN TEmployeeInfo EI
            ON E.EmployeeId = EI.EmployeeId
        INNER JOIN TEmployerDetails TED
            ON TED.EmployerId = EI.EmployerId
        INNER JOIN TTitle T
            ON T.ID = EI.Title
            AND EI.EmployerID = T.EmployerId
        WHERE E.IsActive =
        (
            CASE
                WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                    THEN E.IsActive
                ELSE 'Y'
            END
        )
        AND E.IsActive <> 'P'
        AND E.EmployeeId = @EmployeeId
        AND
        (
            E.IsActive = @IsActive
            OR @IsActive IS NULL
        );
    END;

    IF @RankLevel = 0
    BEGIN
        INSERT INTO @lv_Result
        (
            EmployeeId
        )
        SELECT
            Q.EmployeeId
        FROM
        (
            SELECT
                E.EmployeeId
            FROM TEmployee E
            INNER JOIN TEmployeeInfo EI
                ON E.EmployeeId = EI.EmployeeId
            INNER JOIN TEmployerDetails TED
                ON TED.EmployerId = EI.EmployerId
            INNER JOIN @lv_Hierarchy LH
                ON E.EmployeeId = LH.EmployeeId
            INNER JOIN TTitle T
                ON T.ID = EI.Title
                AND EI.EmployerID = T.EmployerId
            INNER JOIN
            (
                SELECT EmployeeId, EmployerId
                FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
            ) AS S
                ON S.EmployeeId = E.EmployeeId
                AND S.EmployerId = E.EmployerId
            WHERE LH.RankLevel = 1
            AND E.IsActive =
            (
                CASE
                    WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                        THEN E.IsActive
                    ELSE 'Y'
                END
            )
            AND E.IsActive <> 'P'
            AND
            (
                E.IsActive = @IsActive
                OR @IsActive IS NULL
            )

            UNION

            SELECT
                E.EmployeeId
            FROM TEmployee E
            INNER JOIN TEmployeeInfo EI
                ON E.EmployeeId = EI.EmployeeId
            INNER JOIN TEmployerDetails TED
                ON TED.EmployerId = EI.EmployerId
            INNER JOIN @lv_HierarchyFun LH
                ON E.EmployeeId = LH.EmployeeId
            INNER JOIN TTitle T
                ON T.ID = EI.Title
                AND EI.EmployerID = T.EmployerId
            INNER JOIN
            (
                SELECT EmployeeId, EmployerId
                FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
            ) AS S
                ON S.EmployeeId = E.EmployeeId
                AND S.EmployerId = E.EmployerId
            WHERE LH.RankLevel = 1
            AND E.IsActive =
            (
                CASE
                    WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                        THEN E.IsActive
                    ELSE 'Y'
                END
            )
            AND E.IsActive <> 'P'
            AND
            (
                E.IsActive = @IsActive
                OR @IsActive IS NULL
            )
        ) Q;
    END;

    IF @RankLevel = 1
    BEGIN
        INSERT INTO @lv_Result
        (
            EmployeeId
        )
        SELECT
            Q.EmployeeId
        FROM
        (
            SELECT
                E.EmployeeId
            FROM TEmployee E
            INNER JOIN TEmployeeInfo EI
                ON E.EmployeeId = EI.EmployeeId
            INNER JOIN TEmployerDetails TED
                ON TED.EmployerId = EI.EmployerId
            INNER JOIN @lv_Hierarchy LH
                ON E.EmployeeId = LH.EmployeeId
            INNER JOIN TTitle T
                ON T.ID = EI.Title
                AND EI.EmployerID = T.EmployerId
            INNER JOIN
            (
                SELECT EmployeeId, EmployerId
                FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
            ) AS S
                ON S.EmployeeId = E.EmployeeId
                AND S.EmployerId = E.EmployerId
            WHERE LH.RankLevel >= 2
            AND E.IsActive =
            (
                CASE
                    WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                        THEN E.IsActive
                    ELSE 'Y'
                END
            )
            AND E.IsActive <> 'P'
            AND
            (
                E.IsActive = @IsActive
                OR @IsActive IS NULL
            )

            UNION

            SELECT
                E.EmployeeId
            FROM TEmployee E
            INNER JOIN TEmployeeInfo EI
                ON E.EmployeeId = EI.EmployeeId
            INNER JOIN TEmployerDetails TED
                ON TED.EmployerId = EI.EmployerId
            INNER JOIN @lv_HierarchyFun LH
                ON E.EmployeeId = LH.EmployeeId
            INNER JOIN TTitle T
                ON T.ID = EI.Title
                AND EI.EmployerID = T.EmployerId
            INNER JOIN
            (
                SELECT EmployeeId, EmployerId
                FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
            ) AS S
                ON S.EmployeeId = E.EmployeeId
                AND S.EmployerId = E.EmployerId
            WHERE LH.RankLevel >= 2
            AND E.IsActive =
            (
                CASE
                    WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                        THEN E.IsActive
                    ELSE 'Y'
                END
            )
            AND E.IsActive <> 'P'
            AND
            (
                E.IsActive = @IsActive
                OR @IsActive IS NULL
            )
        ) Q;
    END;

    IF @RankLevel = -2
    BEGIN
        INSERT INTO @lv_Result
        (
            EmployeeId
        )
        SELECT
            Q.EmployeeId
        FROM
        (
            SELECT
                E.EmployeeId
            FROM TEmployee E
            INNER JOIN TEmployeeInfo EI
                ON E.EmployeeId = EI.EmployeeId
            INNER JOIN TEmployerDetails TED
                ON TED.EmployerId = EI.EmployerId
            INNER JOIN @lv_Hierarchy LH
                ON E.EmployeeId = LH.EmployeeId
            INNER JOIN TTitle T
                ON T.ID = EI.Title
                AND EI.EmployerID = T.EmployerId
            INNER JOIN
            (
                SELECT EmployeeId, EmployerId
                FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
            ) AS S
                ON S.EmployeeId = E.EmployeeId
                AND S.EmployerId = E.EmployerId
            WHERE LH.RankLevel >= 1
            AND E.IsActive =
            (
                CASE
                    WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                        THEN E.IsActive
                    ELSE 'Y'
                END
            )
            AND E.IsActive <> 'P'
            AND
            (
                E.IsActive = @IsActive
                OR @IsActive IS NULL
            )

            UNION

            SELECT
                E.EmployeeId
            FROM TEmployee E
            INNER JOIN TEmployeeInfo EI
                ON E.EmployeeId = EI.EmployeeId
            INNER JOIN TEmployerDetails TED
                ON TED.EmployerId = EI.EmployerId
            INNER JOIN @lv_HierarchyFun LH
                ON E.EmployeeId = LH.EmployeeId
            INNER JOIN TTitle T
                ON T.ID = EI.Title
                AND EI.EmployerID = T.EmployerId
            INNER JOIN
            (
                SELECT EmployeeId, EmployerId
                FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, NULL)
            ) AS S
                ON S.EmployeeId = E.EmployeeId
                AND S.EmployerId = E.EmployerId
            WHERE LH.RankLevel >= 1
            AND E.IsActive =
            (
                CASE
                    WHEN UPPER(@Lv_RoleName) IN ('ADMINISTRATOR', 'HR')
                        THEN E.IsActive
                    ELSE 'Y'
                END
            )
            AND E.IsActive <> 'P'
            AND
            (
                E.IsActive = @IsActive
                OR @IsActive IS NULL
            )
        ) Q;
    END;

    IF @RankLevel = -3
    BEGIN
        INSERT INTO @lv_Result
        (
            EmployeeId
        )
        SELECT
            E.EmployeeId
        FROM TEmployee E
        INNER JOIN TEmployeeInfo EI
            ON E.EmployeeId = EI.EmployeeId
            AND E.EmployerId = EI.EmployerID
        INNER JOIN TEmployerDetails TED
            ON TED.EmployerId = EI.EmployerId
        INNER JOIN TTitle T
            ON T.ID = EI.Title
            AND EI.EmployerID = T.EmployerId
        INNER JOIN
        (
            SELECT EmployeeId, EmployerId
            FROM dbo.FN_LocationBU_GetAllActiveInActive_EmployeeDetails(@EmployeeId, @Lv_EmployerId)
        ) AS S
            ON S.EmployeeId = E.EmployeeId
            AND S.EmployerId = E.EmployerId
        WHERE E.EmployeeId = EI.EmployeeId
        AND E.EmployerId = @Lv_EmployerId
        AND
        (
            E.IsActive = @IsActive
            OR @IsActive IS NULL
        )
        AND E.IsActive <> 'P';
    END;

    SELECT
        COUNT(1) AS EmployeeCount
    FROM @lv_Result;
END