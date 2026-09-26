-- =============================================================================
-- create-or-clone-role.sql
--
-- Purpose:  Create a tenant Access Right Management role (TRoles), optionally
--           cloning page/tab grants from an existing role. Same live tables as
--           Setup Roles Permission → Submit, without SP_AdminRoleM_InsRoles
--           (no workflow queue, no replace-all).
--
-- UI:       RoleManagement.aspx → Setup Roles Permission → Submit
--
-- WRITE script. Does not assign users. Does not call
-- USP_InsertRecruitmentClaimIfNotExistForRecruiter (MenuId 617).
--
-- Inputs:   @EmployerId            required
--           @RoleName              required, unique (case-insensitive) among
--                                  roles visible to this tenant
--           @RoleDescription       required
--           @RoleType              required: RecruitmentAdmin / Administrator /
--                                  HR / Employee / Manager
--           @ReportingTypeLabel    required: Employee / Manager / Administrator
--                                  (stored as that named role's RoleID)
--           @CreatedBy             required (audit EmployeeId / UserId)
--           @SourceRoleId          optional clone source
--           @SourceRoleName        optional clone source if @SourceRoleId is 0
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                          -- <<< REQUIRED
DECLARE @RoleName VARCHAR(100) = '';                  -- <<< REQUIRED
DECLARE @RoleDescription VARCHAR(1000) = '';          -- <<< REQUIRED
DECLARE @RoleType VARCHAR(100) = '';                  -- <<< REQUIRED
DECLARE @ReportingTypeLabel VARCHAR(50) = 'Employee'; -- Employee / Manager / Administrator
DECLARE @CreatedBy INT = 0;                           -- <<< REQUIRED audit id
DECLARE @SourceRoleId INT = 0;                        -- <<< optional
DECLARE @SourceRoleName VARCHAR(100) = '';            -- <<< optional

IF @EmployerId <= 0
    OR NULLIF(LTRIM(RTRIM(@RoleName)), '') IS NULL
    OR NULLIF(LTRIM(RTRIM(@RoleDescription)), '') IS NULL
    OR NULLIF(LTRIM(RTRIM(@RoleType)), '') IS NULL
    OR @CreatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId, @RoleName, @RoleDescription, @RoleType, and @CreatedBy before running.', 1;
END;

IF @RoleType NOT IN ('RecruitmentAdmin', 'Administrator', 'HR', 'Employee', 'Manager')
BEGIN
    THROW 50000, '@RoleType must be RecruitmentAdmin, Administrator, HR, Employee, or Manager.', 1;
END;

IF @ReportingTypeLabel NOT IN ('Employee', 'Manager', 'Administrator')
BEGIN
    THROW 50000, '@ReportingTypeLabel must be Employee, Manager, or Administrator.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TEmployerDetails
    WHERE Employerid = @EmployerId
)
BEGIN
    THROW 50000, '@EmployerId was not found in TEmployerDetails.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM dbo.TRoles AS Roles
    WHERE LOWER(Roles.RoleName) = LOWER(LTRIM(RTRIM(@RoleName)))
        AND (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
        )
)
BEGIN
    THROW 50000, 'A role with this @RoleName already exists for this tenant (or as a default role).', 1;
END;

DECLARE @ReportingType INT;

SELECT TOP (1)
    @ReportingType = Roles.RoleID
FROM dbo.TRoles AS Roles
WHERE Roles.RoleName = @ReportingTypeLabel
    AND Roles.IsActive = 'Y'
    AND (
        (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
        OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
    )
ORDER BY
    CASE WHEN Roles.Employerid = @EmployerId THEN 0 ELSE 1 END,
    Roles.RoleID;

IF @ReportingType IS NULL
BEGIN
    THROW 50000, 'Could not resolve @ReportingTypeLabel to a TRoles.RoleID for this tenant. Check that Employee / Manager / Administrator roles exist.', 1;
END;

DECLARE @ResolvedSourceRoleId INT = NULLIF(@SourceRoleId, 0);
DECLARE @SourceEmployerId INT;

IF @ResolvedSourceRoleId IS NULL
    AND NULLIF(LTRIM(RTRIM(@SourceRoleName)), '') IS NOT NULL
BEGIN
    SELECT TOP (1)
        @ResolvedSourceRoleId = Roles.RoleID
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleName = LTRIM(RTRIM(@SourceRoleName))
        AND (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
        )
    ORDER BY
        CASE WHEN Roles.Employerid = @EmployerId THEN 0 ELSE 1 END,
        Roles.RoleID;
END;

IF (@SourceRoleId > 0 OR NULLIF(LTRIM(RTRIM(@SourceRoleName)), '') IS NOT NULL)
    AND @ResolvedSourceRoleId IS NULL
BEGIN
    THROW 50000, 'Clone source role was not found for this tenant.', 1;
END;

IF @ResolvedSourceRoleId IS NOT NULL
BEGIN
    SELECT
        @SourceEmployerId = Roles.Employerid
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleID = @ResolvedSourceRoleId;

    SELECT
        'CloneSource' AS DatasetType,
        Roles.RoleID,
        Roles.RoleName,
        Roles.Employerid,
        Roles.RoleType,
        Roles.ReportingType,
        (
            SELECT COUNT(*)
            FROM dbo.TRolePagesMapping AS RolePages
            WHERE RolePages.RoleID = Roles.RoleID
                AND RolePages.Employerid IN (Roles.Employerid, @EmployerId)
        ) AS SourcePageCount
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleID = @ResolvedSourceRoleId;
END;

SELECT
    'Preview' AS DatasetType,
    @EmployerId AS EmployerId,
    LTRIM(RTRIM(@RoleName)) AS RoleName,
    @RoleDescription AS RoleDescription,
    @RoleType AS RoleType,
    @ReportingTypeLabel AS ReportingTypeLabel,
    @ReportingType AS ReportingTypeRoleId,
    @ResolvedSourceRoleId AS SourceRoleId,
    @CreatedBy AS CreatedBy;

BEGIN TRANSACTION;

INSERT INTO dbo.TRoles (
    RoleName,
    IsDefault,
    createdby,
    createDate,
    Employerid,
    IsActive,
    ReportingType,
    RoleDescription,
    RoleType
)
VALUES (
    LTRIM(RTRIM(@RoleName)),
    0,
    @CreatedBy,
    GETDATE(),
    @EmployerId,
    'Y',
    @ReportingType,
    @RoleDescription,
    @RoleType
);

DECLARE @NewRoleId INT = SCOPE_IDENTITY();
DECLARE @CurrentDate DATETIME = GETDATE();
DECLARE @DbName SYSNAME = DB_NAME();

EXEC dbo.USP_SaveHistory
    @DBName = @DbName,
    @MainTableName = 'TRoles',
    @HistoryTableName = 'TRoles_History',
    @ID = 'RoleID',
    @Value = @NewRoleId,
    @HistoryCreatedBy = @CreatedBy,
    @HistoryCreatedDate = @CurrentDate,
    @ActionType = 'I';

IF @ResolvedSourceRoleId IS NOT NULL
BEGIN
    DECLARE @PageHistoryTransId INT = (
        SELECT ISNULL(MAX(RolePageHistory.Transid), 0) + 1
        FROM dbo.TRolePagesMappingHistory AS RolePageHistory
        WHERE RolePageHistory.Employerid = @EmployerId
    );

    DECLARE @ClonePageEmployerId INT = @EmployerId;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.TRolePagesMapping AS RolePages
        WHERE RolePages.RoleID = @ResolvedSourceRoleId
            AND RolePages.Employerid = @EmployerId
    )
    BEGIN
        SET @ClonePageEmployerId = @SourceEmployerId;
    END;

    INSERT INTO dbo.TRolePagesMapping (
        RoleID,
        PageId,
        CreatedBy,
        CreationDate,
        Employerid,
        CreationDateUtcTime,
        LocationIds,
        BusinessUnitIds
    )
    SELECT
        @NewRoleId,
        RolePages.PageId,
        @CreatedBy,
        GETDATE(),
        @EmployerId,
        GETUTCDATE(),
        RolePages.LocationIds,
        RolePages.BusinessUnitIds
    FROM dbo.TRolePagesMapping AS RolePages
    WHERE RolePages.RoleID = @ResolvedSourceRoleId
        AND RolePages.Employerid = @ClonePageEmployerId;

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
    WHERE RolePages.RoleID = @NewRoleId
        AND RolePages.Employerid = @EmployerId;

    DECLARE @TabHistoryTransId INT = (
        SELECT ISNULL(MAX(RoleTabHistory.TransId), 0) + 1
        FROM dbo.TRoleTabDetailsHistory AS RoleTabHistory
        WHERE RoleTabHistory.Employerid = @EmployerId
    );

    DECLARE @CloneTabEmployerId INT = @EmployerId;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.TRoleTabDetails AS RoleTabs
        WHERE RoleTabs.RoleId = @ResolvedSourceRoleId
            AND RoleTabs.Employerid = @EmployerId
    )
    BEGIN
        SET @CloneTabEmployerId = @SourceEmployerId;
    END;

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
        @NewRoleId,
        RoleTabs.MenuId,
        RoleTabs.TabId,
        @EmployerId,
        RoleTabs.IsEditable,
        @CreatedBy,
        CAST(GETDATE() AS DATE)
    FROM dbo.TRoleTabDetails AS RoleTabs
    WHERE RoleTabs.RoleId = @ResolvedSourceRoleId
        AND RoleTabs.Employerid = @CloneTabEmployerId;

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
        @TabHistoryTransId,
        @CreatedBy,
        GETDATE(),
        'I'
    FROM dbo.TRoleTabDetails AS RoleTabs
    WHERE RoleTabs.RoleId = @NewRoleId
        AND RoleTabs.Employerid = @EmployerId;
END;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'CreatedRole' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    Roles.RoleType,
    Roles.ReportingType,
    Roles.RoleDescription,
    Roles.Employerid,
    Roles.IsDefault,
    Roles.IsActive
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @NewRoleId;

SELECT
    'ClonedPages' AS DatasetType,
    RolePages.PageId AS MenuId,
    Menu.MenuName,
    RolePages.LocationIds,
    RolePages.BusinessUnitIds
FROM dbo.TRolePagesMapping AS RolePages
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = RolePages.PageId
    AND Menu.Employerid = RolePages.Employerid
WHERE RolePages.RoleID = @NewRoleId
    AND RolePages.Employerid = @EmployerId;

PRINT 'Created RoleID = ' + CAST(@NewRoleId AS VARCHAR(20)) + '. Uncomment COMMIT TRANSACTION after review.';
PRINT 'Users must be assigned separately (assign-role-to-users.sql). They must re-login after grants.';
