-- =============================================================================
-- update-role.sql
--
-- Purpose:  Update an Access Right Management role header (name, description,
--           RoleType, ReportingType) and optionally stamp LocationIds /
--           BusinessUnitIds onto every TRolePagesMapping row for that role.
--
-- UI:       RoleManagement.aspx → Setup Roles Permission → Edit → Update
--
-- WRITE script. Skips SP_AdminRoleM_UpdRoles (workflow + replace-all pages).
-- Default roles (IsDefault=1): name, description, and reporting type cannot
-- change (same lock as the UI). RoleType and Location/BU may still update.
--
-- Inputs:   @EmployerId            required
--           @RoleId                required unless @RoleName is set
--           @RoleName              lookup if @RoleId is 0
--           @NewRoleName           optional; NULL / blank = leave unchanged
--           @NewRoleDescription    optional
--           @NewRoleType           optional
--           @NewReportingTypeLabel optional: Employee / Manager / Administrator
--           @UpdateLocationBu      Y to apply Location/BU to all page rows
--           @LocationIds           comma list; blank stores NULL
--           @BusinessUnitIds       comma list; blank stores NULL
--           @UpdatedBy             required audit id
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                          -- <<< REQUIRED
DECLARE @RoleId INT = 0;                              -- <<< required unless @RoleName
DECLARE @RoleName VARCHAR(100) = '';                  -- <<< lookup if @RoleId = 0
DECLARE @NewRoleName VARCHAR(100) = NULL;             -- <<< optional
DECLARE @NewRoleDescription VARCHAR(1000) = NULL;     -- <<< optional
DECLARE @NewRoleType VARCHAR(100) = NULL;             -- <<< optional
DECLARE @NewReportingTypeLabel VARCHAR(50) = NULL;    -- <<< optional
DECLARE @UpdateLocationBu CHAR(1) = 'N';              -- <<< Y to stamp Location/BU
DECLARE @LocationIds VARCHAR(MAX) = NULL;
DECLARE @BusinessUnitIds VARCHAR(MAX) = NULL;
DECLARE @UpdatedBy INT = 0;                           -- <<< REQUIRED

IF @EmployerId <= 0
    OR @UpdatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @UpdatedBy before running.', 1;
END;

IF @RoleId <= 0
    AND NULLIF(LTRIM(RTRIM(@RoleName)), '') IS NULL
BEGIN
    THROW 50000, 'Set @RoleId or @RoleName.', 1;
END;

IF @NewRoleType IS NOT NULL
    AND LTRIM(RTRIM(@NewRoleType)) <> ''
    AND @NewRoleType NOT IN ('RecruitmentAdmin', 'Administrator', 'HR', 'Employee', 'Manager')
BEGIN
    THROW 50000, '@NewRoleType must be RecruitmentAdmin, Administrator, HR, Employee, or Manager.', 1;
END;

IF @NewReportingTypeLabel IS NOT NULL
    AND LTRIM(RTRIM(@NewReportingTypeLabel)) <> ''
    AND @NewReportingTypeLabel NOT IN ('Employee', 'Manager', 'Administrator')
BEGIN
    THROW 50000, '@NewReportingTypeLabel must be Employee, Manager, or Administrator.', 1;
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
    )
BEGIN
    THROW 50000, 'Role was not found.', 1;
END;

DECLARE @IsDefault BIT;
DECLARE @CurrentName VARCHAR(100);
DECLARE @CurrentDescription VARCHAR(1000);
DECLARE @CurrentRoleType VARCHAR(100);
DECLARE @CurrentReportingType INT;

SELECT
    @IsDefault = Roles.IsDefault,
    @CurrentName = Roles.RoleName,
    @CurrentDescription = Roles.RoleDescription,
    @CurrentRoleType = Roles.RoleType,
    @CurrentReportingType = Roles.ReportingType
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

DECLARE @ResolvedNewName VARCHAR(100) = COALESCE(NULLIF(LTRIM(RTRIM(@NewRoleName)), ''), @CurrentName);
DECLARE @ResolvedNewDescription VARCHAR(1000) = COALESCE(@NewRoleDescription, @CurrentDescription);
DECLARE @ResolvedNewRoleType VARCHAR(100) = COALESCE(NULLIF(LTRIM(RTRIM(@NewRoleType)), ''), @CurrentRoleType);
DECLARE @ResolvedReportingType INT = @CurrentReportingType;

IF @NewReportingTypeLabel IS NOT NULL
    AND LTRIM(RTRIM(@NewReportingTypeLabel)) <> ''
BEGIN
    SELECT TOP (1)
        @ResolvedReportingType = Roles.RoleID
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleName = LTRIM(RTRIM(@NewReportingTypeLabel))
        AND Roles.IsActive = 'Y'
        AND (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
        )
    ORDER BY
        CASE WHEN Roles.Employerid = @EmployerId THEN 0 ELSE 1 END,
        Roles.RoleID;

    IF @ResolvedReportingType IS NULL
    BEGIN
        THROW 50000, 'Could not resolve @NewReportingTypeLabel to a TRoles.RoleID.', 1;
    END;
END;

IF @IsDefault = 1
    AND (
        @ResolvedNewName <> @CurrentName
        OR ISNULL(@ResolvedNewDescription, '') <> ISNULL(@CurrentDescription, '')
        OR ISNULL(@ResolvedReportingType, 0) <> ISNULL(@CurrentReportingType, 0)
    )
BEGIN
    THROW 50000, 'Default role name, description, and reporting type cannot be changed (same lock as the UI).', 1;
END;

IF @ResolvedNewName <> @CurrentName
    AND EXISTS (
        SELECT 1
        FROM dbo.TRoles AS Roles
        WHERE Roles.RoleID <> @RoleId
            AND LOWER(Roles.RoleName) = LOWER(@ResolvedNewName)
            AND (
                (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
                OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
            )
    )
BEGIN
    THROW 50000, '@NewRoleName already exists for this tenant.', 1;
END;

SELECT
    'CurrentRole' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    Roles.RoleDescription,
    Roles.RoleType,
    Roles.ReportingType,
    Roles.IsDefault,
    Roles.Employerid
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

SELECT
    'ProposedRole' AS DatasetType,
    @RoleId AS RoleID,
    @ResolvedNewName AS RoleName,
    @ResolvedNewDescription AS RoleDescription,
    @ResolvedNewRoleType AS RoleType,
    @ResolvedReportingType AS ReportingType,
    @UpdateLocationBu AS UpdateLocationBu,
    NULLIF(LTRIM(RTRIM(@LocationIds)), '') AS LocationIds,
    NULLIF(LTRIM(RTRIM(@BusinessUnitIds)), '') AS BusinessUnitIds;

SELECT
    'CurrentPageMappings' AS DatasetType,
    RolePages.PageId AS MenuId,
    Menu.MenuName,
    RolePages.LocationIds,
    RolePages.BusinessUnitIds
FROM dbo.TRolePagesMapping AS RolePages
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = RolePages.PageId
    AND Menu.Employerid = RolePages.Employerid
WHERE RolePages.RoleID = @RoleId
    AND RolePages.Employerid = @EmployerId;

BEGIN TRANSACTION;

DECLARE @CurrentDate DATETIME = GETDATE();
DECLARE @DbName SYSNAME = DB_NAME();

EXEC dbo.USP_SaveHistory
    @DBName = @DbName,
    @MainTableName = 'TRoles',
    @HistoryTableName = 'TRoles_History',
    @ID = 'RoleID',
    @Value = @RoleId,
    @HistoryCreatedBy = @UpdatedBy,
    @HistoryCreatedDate = @CurrentDate,
    @ActionType = 'U';

UPDATE dbo.TRoles
SET
    RoleName = @ResolvedNewName,
    RoleDescription = @ResolvedNewDescription,
    RoleType = @ResolvedNewRoleType,
    ReportingType = @ResolvedReportingType,
    updatedby = @UpdatedBy,
    updateDate = GETDATE()
WHERE RoleID = @RoleId;

IF UPPER(@UpdateLocationBu) = 'Y'
BEGIN
    DECLARE @PageHistoryTransId INT = (
        SELECT ISNULL(MAX(RolePageHistory.Transid), 0) + 1
        FROM dbo.TRolePagesMappingHistory AS RolePageHistory
        WHERE RolePageHistory.Employerid = @EmployerId
    );

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
        @UpdatedBy,
        GETDATE(),
        RolePages.Employerid,
        GETUTCDATE(),
        RolePages.LocationIds,
        RolePages.BusinessUnitIds
    FROM dbo.TRolePagesMapping AS RolePages
    WHERE RolePages.RoleID = @RoleId
        AND RolePages.Employerid = @EmployerId;

    UPDATE dbo.TRolePagesMapping
    SET
        LocationIds = NULLIF(LTRIM(RTRIM(@LocationIds)), ''),
        BusinessUnitIds = NULLIF(LTRIM(RTRIM(@BusinessUnitIds)), ''),
        UpdatedBy = @UpdatedBy,
        UpdatedDate = GETDATE()
    WHERE RoleID = @RoleId
        AND Employerid = @EmployerId;
END;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'UpdatedRole' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    Roles.RoleDescription,
    Roles.RoleType,
    Roles.ReportingType,
    Roles.updatedby,
    Roles.updateDate
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

PRINT 'Uncomment COMMIT TRANSACTION after review. Users must re-login to see menu changes.';
