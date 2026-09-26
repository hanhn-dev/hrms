-- =============================================================================
-- grant-or-revoke-role-menus.sql
--
-- Purpose:  Add or remove left-menu grants on a role (TRolePagesMapping).
--           Additive — does not replace the role's existing page list.
--           Uses Sp_InsRolePagesMapping for grants (same helper as
--           seeding/menu/AssignMenuAccess.sql).
--
-- UI:       RoleManagement.aspx → Setup Roles Permission → Access To Pages
--           (the UI save is replace-all; this script is not).
--
-- WRITE script. Role tabs (TRoleTabDetails) are admin-UI state only —
--           they do not show tabs at runtime. Use
--           grant-or-revoke-user-permissions.sql for TUserTabDetails.
--
-- Inputs:   @EmployerId        required
--           @RoleId            required unless @RoleName is set
--           @RoleName          lookup if @RoleId is 0
--           @Action            GRANT or REVOKE
--           @MenuIds           comma-separated MenuIds (PageId)
--           @MenuNames         comma-separated exact names if @MenuIds is blank
--           @CreatedBy         required audit id
--           @LocationIds       optional; else copied from an existing row
--           @BusinessUnitIds   optional; else copied from an existing row
--           @RoleTabRightsDet  optional GRANT tokens: MenuId~TabId~Y/N,...
--                              TabId 0 stores NULL. Does not affect runtime tabs.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                 -- <<< REQUIRED
DECLARE @RoleId INT = 0;                     -- <<< required unless @RoleName
DECLARE @RoleName VARCHAR(100) = '';
DECLARE @Action VARCHAR(10) = 'GRANT';       -- GRANT or REVOKE
DECLARE @MenuIds VARCHAR(MAX) = '';          -- e.g. '12,45,67'
DECLARE @MenuNames VARCHAR(MAX) = '';        -- e.g. 'Leave,Apply Leave'
DECLARE @CreatedBy INT = 0;                  -- <<< REQUIRED
DECLARE @LocationIds VARCHAR(MAX) = NULL;
DECLARE @BusinessUnitIds VARCHAR(MAX) = NULL;
DECLARE @RoleTabRightsDet VARCHAR(MAX) = ''; -- optional, GRANT only

IF @EmployerId <= 0
    OR @CreatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @CreatedBy before running.', 1;
END;

IF UPPER(@Action) NOT IN ('GRANT', 'REVOKE')
BEGIN
    THROW 50000, '@Action must be GRANT or REVOKE.', 1;
END;

IF @RoleId <= 0
    AND NULLIF(LTRIM(RTRIM(@RoleName)), '') IS NULL
BEGIN
    THROW 50000, 'Set @RoleId or @RoleName.', 1;
END;

IF @RoleId <= 0
BEGIN
    SELECT TOP (1)
        @RoleId = Roles.RoleID
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleName = LTRIM(RTRIM(@RoleName))
        AND (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
        )
    ORDER BY
        CASE WHEN Roles.Employerid = @EmployerId THEN 0 ELSE 1 END,
        Roles.RoleID;
END;

IF @RoleId IS NULL
    OR @RoleId <= 0
    OR NOT EXISTS (
        SELECT 1
        FROM dbo.TRoles AS Roles
        WHERE Roles.RoleID = @RoleId
            AND Roles.IsActive = 'Y'
    )
BEGIN
    THROW 50000, 'Active role was not found for this tenant.', 1;
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
BEGIN
    THROW 50000, 'Set @MenuIds or @MenuNames to at least one menu that exists for this employer.', 1;
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
    THROW 50000, 'One or more MenuIds are missing or inactive in tMenuDetails for this employer. Run diagnose-access-rights.sql / add-employer-menu-and-sync-xml.sql first.', 1;
END;

DECLARE @CopiedLocationIds VARCHAR(MAX) = NULLIF(LTRIM(RTRIM(@LocationIds)), '');
DECLARE @CopiedBusinessUnitIds VARCHAR(MAX) = NULLIF(LTRIM(RTRIM(@BusinessUnitIds)), '');

IF @CopiedLocationIds IS NULL
    OR @CopiedBusinessUnitIds IS NULL
BEGIN
    SELECT TOP (1)
        @CopiedLocationIds = COALESCE(@CopiedLocationIds, RolePages.LocationIds),
        @CopiedBusinessUnitIds = COALESCE(@CopiedBusinessUnitIds, RolePages.BusinessUnitIds)
    FROM dbo.TRolePagesMapping AS RolePages
    WHERE RolePages.RoleID = @RoleId
        AND RolePages.Employerid = @EmployerId
        AND (
            RolePages.LocationIds IS NOT NULL
            OR RolePages.BusinessUnitIds IS NOT NULL
        );
END;

SELECT
    'Role' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    Roles.Employerid,
    @Action AS Action
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

SELECT
    'TargetMenus' AS DatasetType,
    TargetMenus.MenuId,
    TargetMenus.MenuName,
    CASE
        WHEN RolePages.RoleID IS NOT NULL THEN 'Y'
        ELSE 'N'
    END AS AlreadyGranted
FROM @TargetMenus AS TargetMenus
LEFT JOIN dbo.TRolePagesMapping AS RolePages
    ON RolePages.RoleID = @RoleId
    AND RolePages.PageId = TargetMenus.MenuId
    AND RolePages.Employerid = @EmployerId;

BEGIN TRANSACTION;

DECLARE @PageHistoryTransId INT = (
    SELECT ISNULL(MAX(RolePageHistory.Transid), 0) + 1
    FROM dbo.TRolePagesMappingHistory AS RolePageHistory
    WHERE RolePageHistory.Employerid = @EmployerId
);

IF UPPER(@Action) = 'GRANT'
BEGIN
    DECLARE @GrantMenuId INT;

    DECLARE GrantMenus CURSOR LOCAL FAST_FORWARD FOR
        SELECT TargetMenus.MenuId
        FROM @TargetMenus AS TargetMenus;

    OPEN GrantMenus;
    FETCH NEXT FROM GrantMenus INTO @GrantMenuId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.TRolePagesMapping AS RolePages
            WHERE RolePages.RoleID = @RoleId
                AND RolePages.PageId = @GrantMenuId
                AND RolePages.Employerid = @EmployerId
        )
        BEGIN
            EXEC dbo.Sp_InsRolePagesMapping
                @RoleId = @RoleId,
                @PageId = @GrantMenuId,
                @EmployerId = @EmployerId,
                @CreatedBy = @CreatedBy;

            UPDATE dbo.TRolePagesMapping
            SET
                LocationIds = @CopiedLocationIds,
                BusinessUnitIds = @CopiedBusinessUnitIds
            WHERE RoleID = @RoleId
                AND PageId = @GrantMenuId
                AND Employerid = @EmployerId
                AND LocationIds IS NULL
                AND BusinessUnitIds IS NULL;
        END;

        FETCH NEXT FROM GrantMenus INTO @GrantMenuId;
    END;

    CLOSE GrantMenus;
    DEALLOCATE GrantMenus;

    IF NULLIF(LTRIM(RTRIM(@RoleTabRightsDet)), '') IS NOT NULL
    BEGIN
        DECLARE @TabHistoryTransId INT = (
            SELECT ISNULL(MAX(RoleTabHistory.TransId), 0) + 1
            FROM dbo.TRoleTabDetailsHistory AS RoleTabHistory
            WHERE RoleTabHistory.Employerid = @EmployerId
        );

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
        FROM STRING_SPLIT(@RoleTabRightsDet, ',') AS TokenSplit
        WHERE LTRIM(RTRIM(TokenSplit.value)) <> '';

        INSERT INTO dbo.TRoleTabDetails (
            RoleId,
            MenuId,
            TabId,
            Employerid,
            IsEditable,
            CreatedBy,
            CreatedDate
        )
        SELECT
            @RoleId,
            TabTokens.MenuId,
            TabTokens.TabId,
            @EmployerId,
            TabTokens.IsEditable,
            @CreatedBy,
            CAST(GETDATE() AS DATE)
        FROM @TabTokens AS TabTokens
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.TRoleTabDetails AS RoleTabs
            WHERE RoleTabs.RoleId = @RoleId
                AND RoleTabs.Employerid = @EmployerId
                AND RoleTabs.MenuId = TabTokens.MenuId
                AND (
                    (RoleTabs.TabId IS NULL AND TabTokens.TabId IS NULL)
                    OR RoleTabs.TabId = TabTokens.TabId
                )
        );

        INSERT INTO dbo.TRoleTabDetailsHistory (
            RoleId,
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
            @RoleId,
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

        PRINT 'Role tab rows written to TRoleTabDetails are admin-UI state only. Runtime tabs require TUserTabDetails (grant-or-revoke-user-permissions.sql).';
    END;
END;
ELSE
BEGIN
    INSERT INTO dbo.TRolePagesMappingHistory (
        Transid,
        RoleID,
        PageId,
        ModifiedBy,
        ModifyDate,
        Employerid,
        ModifyDateUtcTime,
        LocationIds,
        BusinessUnitIds
    )
    SELECT
        @PageHistoryTransId,
        RolePages.RoleID,
        RolePages.PageId,
        @CreatedBy,
        GETDATE(),
        RolePages.Employerid,
        GETUTCDATE(),
        RolePages.LocationIds,
        RolePages.BusinessUnitIds
    FROM dbo.TRolePagesMapping AS RolePages
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = RolePages.PageId
    WHERE RolePages.RoleID = @RoleId
        AND RolePages.Employerid = @EmployerId;

    DELETE RolePages
    FROM dbo.TRolePagesMapping AS RolePages
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = RolePages.PageId
    WHERE RolePages.RoleID = @RoleId
        AND RolePages.Employerid = @EmployerId;

    DECLARE @RevokeTabHistoryTransId INT = (
        SELECT ISNULL(MAX(RoleTabHistory.TransId), 0) + 1
        FROM dbo.TRoleTabDetailsHistory AS RoleTabHistory
        WHERE RoleTabHistory.Employerid = @EmployerId
    );

    INSERT INTO dbo.TRoleTabDetailsHistory (
        RoleId,
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
        RoleTabs.RoleId,
        RoleTabs.MenuId,
        RoleTabs.TabId,
        RoleTabs.Employerid,
        RoleTabs.IsEditable,
        @CreatedBy,
        CAST(GETDATE() AS DATE),
        @RevokeTabHistoryTransId,
        @CreatedBy,
        GETDATE(),
        'D'
    FROM dbo.TRoleTabDetails AS RoleTabs
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = RoleTabs.MenuId
    WHERE RoleTabs.RoleId = @RoleId
        AND RoleTabs.Employerid = @EmployerId;

    DELETE RoleTabs
    FROM dbo.TRoleTabDetails AS RoleTabs
    INNER JOIN @TargetMenus AS TargetMenus
        ON TargetMenus.MenuId = RoleTabs.MenuId
    WHERE RoleTabs.RoleId = @RoleId
        AND RoleTabs.Employerid = @EmployerId;
END;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'RolePagesAfter' AS DatasetType,
    RolePages.PageId AS MenuId,
    Menu.MenuName,
    RolePages.LocationIds,
    RolePages.BusinessUnitIds,
    RolePages.CreationDate
FROM dbo.TRolePagesMapping AS RolePages
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = RolePages.PageId
    AND Menu.Employerid = RolePages.Employerid
WHERE RolePages.RoleID = @RoleId
    AND RolePages.Employerid = @EmployerId
ORDER BY
    Menu.MenuName;

PRINT 'Users with this role must log out and back in (Session[HRMS_MENU]). Uncomment COMMIT TRANSACTION after review.';
