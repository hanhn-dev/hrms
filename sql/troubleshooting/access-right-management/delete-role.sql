-- =============================================================================
-- delete-role.sql
--
-- Purpose:  Delete a non-default Access Right Management role that has no
--           users assigned. Cleans TRollWisePageAccess, TRolePagesMapping,
--           and TRoleTabDetails (SP_DeleteRole leaves tab orphans).
--
-- UI:       RoleManagement.aspx → Setup Roles Permission → Delete
--
-- WRITE script. Destructive. Set @ConfirmDelete = 'DELETE' after reviewing
-- the preview.
--
-- Inputs:   @EmployerId     required
--           @RoleId         required unless @RoleName is set
--           @RoleName       lookup if @RoleId is 0
--           @DeletedBy      required audit id (TRoles_History)
--           @ConfirmDelete  must be DELETE
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                 -- <<< REQUIRED
DECLARE @RoleId INT = 0;                     -- <<< required unless @RoleName
DECLARE @RoleName VARCHAR(100) = '';         -- <<< lookup if @RoleId = 0
DECLARE @DeletedBy INT = 0;                  -- <<< REQUIRED
DECLARE @ConfirmDelete VARCHAR(10) = '';     -- <<< must be DELETE

IF @EmployerId <= 0
    OR @DeletedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @DeletedBy before running.', 1;
END;

IF @ConfirmDelete <> 'DELETE'
BEGIN
    THROW 50000, 'Set @ConfirmDelete = ''DELETE'' after you have reviewed diagnose-access-rights.sql for this role.', 1;
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
    )
BEGIN
    THROW 50000, 'Role was not found.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleID = @RoleId
        AND Roles.IsDefault = 1
)
BEGIN
    THROW 50000, 'Default role cannot be removed.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM dbo.TUsers AS Users
    WHERE Users.RoleID = @RoleId
)
BEGIN
    THROW 50000, 'Role is mapped to one or more users and cannot be removed. Reassign them with assign-role-to-users.sql first.', 1;
END;

SELECT
    'RoleToDelete' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    Roles.Employerid,
    Roles.IsDefault,
    Roles.RoleType
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

SELECT
    'PagesToDelete' AS DatasetType,
    RolePages.PageId AS MenuId,
    Menu.MenuName
FROM dbo.TRolePagesMapping AS RolePages
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = RolePages.PageId
    AND Menu.Employerid = RolePages.Employerid
WHERE RolePages.RoleID = @RoleId
    AND RolePages.Employerid = @EmployerId;

SELECT
    'RoleTabsToDelete' AS DatasetType,
    RoleTabs.MenuId,
    RoleTabs.TabId,
    RoleTabs.IsEditable
FROM dbo.TRoleTabDetails AS RoleTabs
WHERE RoleTabs.RoleId = @RoleId
    AND RoleTabs.Employerid = @EmployerId;

SELECT
    'EmployeeSummaryToDelete' AS DatasetType,
    Summary.RoleWisePageId,
    Summary.Menuid,
    Summary.Tabid,
    Summary.EmployeeIds
FROM dbo.TRollWisePageAccess AS Summary
WHERE Summary.RoleId = @RoleId
    AND Summary.EmployerId = @EmployerId;

BEGIN TRANSACTION;

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
    @DeletedBy,
    GETDATE(),
    RolePages.Employerid,
    GETUTCDATE(),
    RolePages.LocationIds,
    RolePages.BusinessUnitIds
FROM dbo.TRolePagesMapping AS RolePages
WHERE RolePages.RoleID = @RoleId
    AND RolePages.Employerid = @EmployerId;

DECLARE @TabHistoryTransId INT = (
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
    @DeletedBy,
    CAST(GETDATE() AS DATE),
    @TabHistoryTransId,
    @DeletedBy,
    GETDATE(),
    'D'
FROM dbo.TRoleTabDetails AS RoleTabs
WHERE RoleTabs.RoleId = @RoleId
    AND RoleTabs.Employerid = @EmployerId;

DECLARE @SummaryHistoryTransId INT = (
    SELECT ISNULL(MAX(SummaryHistory.RoleWisePageId), 0) + 1
    FROM dbo.TRollWisePageAccessHistory AS SummaryHistory
    WHERE SummaryHistory.EmployerId = @EmployerId
);

INSERT INTO dbo.TRollWisePageAccessHistory (
    RoleWisePageId,
    RoleId,
    PageModuleId,
    ActiveFlag,
    InActiveFlag,
    EmployerId,
    CreatedBy,
    CreatedDate,
    ModifiedBy,
    ModifiedDate,
    TabId,
    MenuId,
    ModifyDateUtcTime,
    EmployeeIds
)
SELECT
    @SummaryHistoryTransId,
    Summary.RoleId,
    Summary.PageModuleId,
    Summary.ActiveFlag,
    Summary.InActiveFlag,
    Summary.EmployerId,
    Summary.CreatedBy,
    Summary.CreatedDate,
    @DeletedBy,
    GETDATE(),
    Summary.Tabid,
    Summary.Menuid,
    GETUTCDATE(),
    Summary.EmployeeIds
FROM dbo.TRollWisePageAccess AS Summary
WHERE Summary.RoleId = @RoleId
    AND Summary.EmployerId = @EmployerId;

DELETE
FROM dbo.TRollWisePageAccess
WHERE RoleId = @RoleId
    AND EmployerId = @EmployerId;

DELETE
FROM dbo.TRoleTabDetails
WHERE RoleId = @RoleId
    AND Employerid = @EmployerId;

DELETE
FROM dbo.TRolePagesMapping
WHERE RoleID = @RoleId
    AND Employerid = @EmployerId;

DECLARE @CurrentDate DATETIME = GETDATE();
DECLARE @DbName SYSNAME = DB_NAME();

EXEC dbo.USP_SaveHistory
    @DBName = @DbName,
    @MainTableName = 'TRoles',
    @HistoryTableName = 'TRoles_History',
    @ID = 'RoleID',
    @Value = @RoleId,
    @HistoryCreatedBy = @DeletedBy,
    @HistoryCreatedDate = @CurrentDate,
    @ActionType = 'D';

DELETE
FROM dbo.TRoles
WHERE RoleID = @RoleId
    AND Employerid = @EmployerId;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'RemainingRoleRow' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

PRINT 'If RemainingRoleRow is empty, the delete succeeded in this transaction. Uncomment COMMIT TRANSACTION after review.';
