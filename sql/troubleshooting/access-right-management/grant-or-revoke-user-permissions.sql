-- =============================================================================
-- grant-or-revoke-user-permissions.sql
--
-- Purpose:  Additive additional-user page and tab grants
--           (TUSerPagesMapping / TUserTabDetails). This is the runtime tab
--           gate — TRoleTabDetails is not.
--
-- UI:       RoleManagement.aspx → Additional Users Permissions → Submit
--           (the UI save is replace-all; this script is not).
--
-- WRITE script. Skips SP_AdminRoleM_InsUserPageMap.
--
-- Inputs:   @EmployerId        required
--           @EmploymentNumber  required unless @UserId / @EmployeeId is set
--           @EmployeeId        optional
--           @UserId            optional TUsers.UserID
--           @Action            GRANT or REVOKE
--           @MenuIds           comma-separated MenuIds
--           @MenuNames         comma-separated exact names if @MenuIds is blank
--           @CreatedBy         required audit id
--           @LocationIds       optional on newly granted page rows
--           @BusinessUnitIds   optional on newly granted page rows
--           @TabRightsDet      optional GRANT tokens: MenuId~TabId~Y/N,...
--                              TabId 0 stores NULL. Runtime needs a real TabId
--                              and a TTabDetails row for this Employerid.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 10;                 -- <<< REQUIRED
DECLARE @EmploymentNumber NVARCHAR(20) = ''; -- <<< or @EmployeeId / @UserId
DECLARE @EmployeeId INT = NULL;
DECLARE @UserId INT = NULL;
DECLARE @Action VARCHAR(10) = 'GRANT';       -- GRANT or REVOKE
DECLARE @MenuIds VARCHAR(MAX) = '';
DECLARE @MenuNames VARCHAR(MAX) = '';
DECLARE @CreatedBy INT = 0;                  -- <<< REQUIRED
DECLARE @LocationIds VARCHAR(MAX) = NULL;
DECLARE @BusinessUnitIds VARCHAR(MAX) = NULL;
DECLARE @TabRightsDet VARCHAR(MAX) = '';

IF @EmployerId <= 0
    OR @CreatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @CreatedBy before running.', 1;
END;

IF UPPER(@Action) NOT IN ('GRANT', 'REVOKE')
BEGIN
    THROW 50000, '@Action must be GRANT or REVOKE.', 1;
END;

IF @UserId IS NULL
    AND @EmployeeId IS NULL
    AND NULLIF(LTRIM(RTRIM(@EmploymentNumber)), '') IS NOT NULL
BEGIN
    SELECT @EmployeeId = EmployeeInfo.EmployeeId
    FROM dbo.TEmployeeInfo AS EmployeeInfo
    WHERE EmployeeInfo.EmploymentNumber = LTRIM(RTRIM(@EmploymentNumber));
END;

IF @UserId IS NULL
    AND @EmployeeId IS NOT NULL
BEGIN
    SELECT TOP (1)
        @UserId = UserEmployee.UserID
    FROM dbo.TUserEmployee AS UserEmployee
    INNER JOIN dbo.TUsers AS Users
        ON Users.UserID = UserEmployee.UserID
        AND Users.Employerid = @EmployerId
    WHERE UserEmployee.EmployeeID = @EmployeeId
    ORDER BY UserEmployee.UserID DESC;
END;

IF @UserId IS NULL
    OR @UserId <= 0
    OR NOT EXISTS (
        SELECT 1
        FROM dbo.TUsers AS Users
        WHERE Users.UserID = @UserId
            AND Users.Employerid = @EmployerId
    )
BEGIN
    THROW 50000, 'User was not found for this employer. Set @EmploymentNumber, @EmployeeId, or @UserId (TUsers.UserID, not EmployeeId).', 1;
END;

DECLARE @UserRoleId INT;

SELECT
    @UserRoleId = Users.RoleID,
    @EmployeeId = COALESCE(@EmployeeId, UserEmployee.EmployeeID)
FROM dbo.TUsers AS Users
LEFT JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = Users.UserID
WHERE Users.UserID = @UserId;

IF NULLIF(LTRIM(RTRIM(@EmploymentNumber)), '') IS NULL
    AND @EmployeeId IS NOT NULL
BEGIN
    SELECT @EmploymentNumber = EmployeeInfo.EmploymentNumber
    FROM dbo.TEmployeeInfo AS EmployeeInfo
    WHERE EmployeeInfo.EmployeeId = @EmployeeId;
END;

DECLARE @TargetMenus TABLE (
    MenuId INT NOT NULL PRIMARY KEY,
    MenuName VARCHAR(200) NULL
);

IF NULLIF(LTRIM(RTRIM(@MenuIds)), '') IS NOT NULL
BEGIN
    INSERT INTO @TargetMenus (MenuId)
    SELECT DISTINCT
        TRY_CAST(LTRIM(RTRIM(MenuSplit.value)) AS INT)
    FROM STRING_SPLIT(@MenuIds, ',') AS MenuSplit
    WHERE LTRIM(RTRIM(MenuSplit.value)) <> ''
        AND TRY_CAST(LTRIM(RTRIM(MenuSplit.value)) AS INT) IS NOT NULL;
END;
ELSE IF NULLIF(LTRIM(RTRIM(@MenuNames)), '') IS NOT NULL
BEGIN
    INSERT INTO @TargetMenus (MenuId, MenuName)
    SELECT DISTINCT
        Menu.MenuId,
        Menu.MenuName
    FROM STRING_SPLIT(@MenuNames, ',') AS NameSplit
    INNER JOIN dbo.tMenuDetails AS Menu
        ON Menu.MenuName = LTRIM(RTRIM(NameSplit.value))
        AND Menu.Employerid = @EmployerId
    WHERE LTRIM(RTRIM(NameSplit.value)) <> '';
END;

IF NOT EXISTS (
    SELECT 1
    FROM @TargetMenus
)
    AND NULLIF(LTRIM(RTRIM(@TabRightsDet)), '') IS NULL
BEGIN
    THROW 50000, 'Set @MenuIds, @MenuNames, and/or @TabRightsDet.', 1;
END;

UPDATE TargetMenus
SET TargetMenus.MenuName = Menu.MenuName
FROM @TargetMenus AS TargetMenus
INNER JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = TargetMenus.MenuId
    AND Menu.Employerid = @EmployerId;

IF EXISTS (
    SELECT 1
    FROM @TargetMenus AS TargetMenus
    LEFT JOIN dbo.tMenuDetails AS Menu
        ON Menu.MenuId = TargetMenus.MenuId
        AND Menu.Employerid = @EmployerId
        AND Menu.ISActive = 1
    WHERE Menu.MenuId IS NULL
)
BEGIN
    THROW 50000, 'One or more MenuIds are missing or inactive in tMenuDetails for this employer.', 1;
END;

DECLARE @TabMasterCount INT = (
    SELECT COUNT(*)
    FROM dbo.TTabDetails AS Tab
    WHERE Tab.Employerid = @EmployerId
);

SELECT
    'User' AS DatasetType,
    @UserId AS UserId,
    @EmploymentNumber AS EmploymentNumber,
    @UserRoleId AS RoleId,
    Roles.RoleName,
    @Action AS Action,
    @TabMasterCount AS TabDetailsRowCountForEmployer,
    CASE
        WHEN @TabMasterCount = 0
            THEN 'NO TTabDetails rows for this employer — granted user tabs will not show at runtime'
        ELSE 'TTabDetails has rows for this employer'
    END AS TabMasterNote
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @UserRoleId;

SELECT
    'TargetMenus' AS DatasetType,
    TargetMenus.MenuId,
    TargetMenus.MenuName,
    CASE
        WHEN RolePages.RoleID IS NOT NULL THEN 'Y'
        ELSE 'N'
    END AS AlreadyOnRole,
    CASE
        WHEN UserPages.UserID IS NOT NULL THEN 'Y'
        ELSE 'N'
    END AS AlreadyOnUser
FROM @TargetMenus AS TargetMenus
LEFT JOIN dbo.TRolePagesMapping AS RolePages
    ON RolePages.RoleID = @UserRoleId
    AND RolePages.PageId = TargetMenus.MenuId
    AND RolePages.Employerid = @EmployerId
LEFT JOIN dbo.TUSerPagesMapping AS UserPages
    ON UserPages.UserID = @UserId
    AND UserPages.PageId = TargetMenus.MenuId
    AND UserPages.Employerid = @EmployerId;

BEGIN TRANSACTION;

DECLARE @PageHistoryTransId INT = (
    SELECT ISNULL(MAX(UserPageHistory.transid), 0) + 1
    FROM dbo.TUSerPagesMappingHistory AS UserPageHistory
    WHERE UserPageHistory.Employerid = @EmployerId
);

IF UPPER(@Action) = 'GRANT'
BEGIN
    INSERT INTO dbo.TUSerPagesMapping (
        UserID,
        PageId,
        CreatedBy,
        CreationDate,
        Employerid,
        CreationDateUtcTime,
        roleid,
        LocationIds,
        BusinessUnitIds
    )
    SELECT
        @UserId,
        TargetMenus.MenuId,
        @CreatedBy,
        GETDATE(),
        @EmployerId,
        GETUTCDATE(),
        @UserRoleId,
        NULLIF(LTRIM(RTRIM(@LocationIds)), ''),
        NULLIF(LTRIM(RTRIM(@BusinessUnitIds)), '')
    FROM @TargetMenus AS TargetMenus
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.TUSerPagesMapping AS UserPages
        WHERE UserPages.UserID = @UserId
            AND UserPages.PageId = TargetMenus.MenuId
            AND UserPages.Employerid = @EmployerId
    );

    INSERT INTO dbo.TUSerPagesMappingHistory (
        UserID,
        PageId,
        ModifiedBy,
        Modifiedon,
        transid,
        Employerid,
        ModifiedUtcTime,
        roleid,
        LocationIds,
        BusinessUnitIds
    )
    SELECT
        @UserId,
        TargetMenus.MenuId,
        @CreatedBy,
        GETDATE(),
        @PageHistoryTransId,
        @EmployerId,
        GETUTCDATE(),
        @UserRoleId,
        NULLIF(LTRIM(RTRIM(@LocationIds)), ''),
        NULLIF(LTRIM(RTRIM(@BusinessUnitIds)), '')
    FROM @TargetMenus AS TargetMenus
    WHERE EXISTS (
        SELECT 1
        FROM dbo.TUSerPagesMapping AS UserPages
        WHERE UserPages.UserID = @UserId
            AND UserPages.PageId = TargetMenus.MenuId
            AND UserPages.Employerid = @EmployerId
    );

    IF NULLIF(LTRIM(RTRIM(@TabRightsDet)), '') IS NOT NULL
    BEGIN
        DECLARE @TabTokens TABLE (
            MenuId INT NOT NULL,
            TabId INT NULL,
            IsEditable CHAR(1) NOT NULL
        );

        INSERT INTO @TabTokens (MenuId, TabId, IsEditable)
        SELECT
            TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(TokenSplit.value)), '~', '.'), 3) AS INT),
            NULLIF(TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(TokenSplit.value)), '~', '.'), 2) AS INT), 0),
            PARSENAME(REPLACE(LTRIM(RTRIM(TokenSplit.value)), '~', '.'), 1)
        FROM STRING_SPLIT(@TabRightsDet, ',') AS TokenSplit
        WHERE LTRIM(RTRIM(TokenSplit.value)) <> '';

        IF EXISTS (
            SELECT 1
            FROM @TabTokens AS TabTokens
            WHERE TabTokens.TabId IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM dbo.TTabDetails AS Tab
                    WHERE Tab.Tabid = TabTokens.TabId
                )
        )
        BEGIN
            THROW 50000, 'One or more TabIds in @TabRightsDet do not exist in TTabDetails (FK on TUserTabDetails.TabId).', 1;
        END;

        DECLARE @TabHistoryTransId INT = (
            SELECT ISNULL(MAX(UserTabHistory.TransId), 0) + 1
            FROM dbo.TUserTabDetailsHistory AS UserTabHistory
            WHERE UserTabHistory.Employerid = @EmployerId
        );

        INSERT INTO dbo.TUserTabDetails (
            UserId,
            MenuId,
            TabId,
            Employerid,
            IsEditable,
            CreatedBy,
            CreatedDate
        )
        SELECT
            @UserId,
            TabTokens.MenuId,
            TabTokens.TabId,
            @EmployerId,
            TabTokens.IsEditable,
            @CreatedBy,
            CAST(GETDATE() AS DATE)
        FROM @TabTokens AS TabTokens
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.TUserTabDetails AS UserTabs
            WHERE UserTabs.UserId = @UserId
                AND UserTabs.Employerid = @EmployerId
                AND UserTabs.MenuId = TabTokens.MenuId
                AND (
                    (UserTabs.TabId IS NULL AND TabTokens.TabId IS NULL)
                    OR UserTabs.TabId = TabTokens.TabId
                )
        );

        INSERT INTO dbo.TUserTabDetailsHistory (
            UserId,
            MenuId,
            TabId,
            Employerid,
            IsEditable,
            ModifyBy,
            ModifyDate,
            TransId,
            HistoryCreatedBy,
            HistoryCreatedDate,
            ActionType
        )
        SELECT
            @UserId,
            TabTokens.MenuId,
            TabTokens.TabId,
            @EmployerId,
            TabTokens.IsEditable,
            @CreatedBy,
            CAST(GETDATE() AS DATE),
            @TabHistoryTransId,
            @CreatedBy,
            GETDATE(),
            'I'
        FROM @TabTokens AS TabTokens;
    END;
END;
ELSE
BEGIN
    INSERT INTO dbo.TUSerPagesMappingHistory (
        UserID,
        PageId,
        ModifiedBy,
        Modifiedon,
        transid,
        Employerid,
        ModifiedUtcTime,
        roleid,
        LocationIds,
        BusinessUnitIds
    )
    SELECT
        UserPages.UserID,
        UserPages.PageId,
        @CreatedBy,
        GETDATE(),
        @PageHistoryTransId,
        UserPages.Employerid,
        GETUTCDATE(),
        UserPages.roleid,
        UserPages.LocationIds,
        UserPages.BusinessUnitIds
    FROM dbo.TUSerPagesMapping AS UserPages
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = UserPages.PageId
    WHERE UserPages.UserID = @UserId
        AND UserPages.Employerid = @EmployerId;

    DELETE UserPages
    FROM dbo.TUSerPagesMapping AS UserPages
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = UserPages.PageId
    WHERE UserPages.UserID = @UserId
        AND UserPages.Employerid = @EmployerId;

    DECLARE @RevokeTabHistoryTransId INT = (
        SELECT ISNULL(MAX(UserTabHistory.TransId), 0) + 1
        FROM dbo.TUserTabDetailsHistory AS UserTabHistory
        WHERE UserTabHistory.Employerid = @EmployerId
    );

    INSERT INTO dbo.TUserTabDetailsHistory (
        UserId,
        MenuId,
        TabId,
        Employerid,
        IsEditable,
        ModifyBy,
        ModifyDate,
        TransId,
        HistoryCreatedBy,
        HistoryCreatedDate,
        ActionType
    )
    SELECT
        UserTabs.UserId,
        UserTabs.MenuId,
        UserTabs.TabId,
        UserTabs.Employerid,
        UserTabs.IsEditable,
        @CreatedBy,
        CAST(GETDATE() AS DATE),
        @RevokeTabHistoryTransId,
        @CreatedBy,
        GETDATE(),
        'D'
    FROM dbo.TUserTabDetails AS UserTabs
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = UserTabs.MenuId
    WHERE UserTabs.UserId = @UserId
        AND UserTabs.Employerid = @EmployerId;

    DELETE UserTabs
    FROM dbo.TUserTabDetails AS UserTabs
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = UserTabs.MenuId
    WHERE UserTabs.UserId = @UserId
        AND UserTabs.Employerid = @EmployerId;
END;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'UserPagesAfter' AS DatasetType,
    UserPages.PageId AS MenuId,
    Menu.MenuName,
    UserPages.roleid,
    UserPages.LocationIds,
    UserPages.BusinessUnitIds
FROM dbo.TUSerPagesMapping AS UserPages
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = UserPages.PageId
    AND Menu.Employerid = UserPages.Employerid
WHERE UserPages.UserID = @UserId
    AND UserPages.Employerid = @EmployerId;

SELECT
    'UserTabsAfter' AS DatasetType,
    UserTabs.MenuId,
    Menu.MenuName,
    UserTabs.TabId,
    Tab.TabName,
    Tab.Employerid AS TabMasterEmployerid,
    UserTabs.IsEditable
FROM dbo.TUserTabDetails AS UserTabs
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = UserTabs.MenuId
    AND Menu.Employerid = UserTabs.Employerid
LEFT JOIN dbo.TTabDetails AS Tab
    ON Tab.Tabid = UserTabs.TabId
WHERE UserTabs.UserId = @UserId
    AND UserTabs.Employerid = @EmployerId;

PRINT 'User must log out and back in (Session[HRMS_MENU]). Uncomment COMMIT TRANSACTION after review.';
