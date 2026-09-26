-- =============================================================================
-- diagnose-access-rights.sql
--
-- Purpose:  Read-only inventory of Access Right Management for one employer
--           (RoleManagement.aspx). Shows roles, page/tab grants, user
--           assignments, additional user overrides, employee-summary
--           permissions, pending admin-change requests, and the TTabDetails
--           tenant-gap check.
--
-- When to use: before any write script in this folder, or when the UI
--           disagrees with what a user can see.
--
-- Inputs:   @EmployerId       required
--           @RoleName         optional LIKE filter on TRoles.RoleName
--           @RoleId           optional exact RoleID (wins over @RoleName)
--           @EmploymentNumber optional; scopes user/override result sets
--           @EmployeeId       optional alternative to @EmploymentNumber
--           @MenuName         optional LIKE filter on menu names
--
-- Type:     Read-only (SELECT only). No permanent objects.
--
-- Related:  ../menu/employee-missing-menu-or-tab/diagnose-menu-tab-access.sql
--           for one employee's runtime menu/tab gate.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @EmployerId INT = 0;                 -- <<< REQUIRED
DECLARE @RoleId INT = NULL;                  -- <<< optional exact RoleID
DECLARE @RoleName VARCHAR(100) = NULL;       -- <<< optional, e.g. '%HR%'
DECLARE @EmploymentNumber NVARCHAR(20) = NULL; -- <<< optional, e.g. 'E0001'
DECLARE @EmployeeId INT = NULL;              -- <<< optional alternative
DECLARE @MenuName VARCHAR(200) = NULL;       -- <<< optional, e.g. '%Leave%'

IF @EmployerId <= 0
BEGIN
    THROW 50000, 'Set @EmployerId (> 0) before running.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TEmployerDetails
    WHERE Employerid = @EmployerId
)
BEGIN
    THROW 50000, '@EmployerId was not found in TEmployerDetails.', 1;
END;

IF @EmploymentNumber IS NOT NULL
    AND LTRIM(RTRIM(@EmploymentNumber)) <> ''
BEGIN
    SELECT @EmployeeId = EmployeeInfo.EmployeeId
    FROM dbo.TEmployeeInfo AS EmployeeInfo
    WHERE EmployeeInfo.EmploymentNumber = LTRIM(RTRIM(@EmploymentNumber));

    IF @EmployeeId IS NULL
    BEGIN
        THROW 50000, '@EmploymentNumber was not found in TEmployeeInfo.', 1;
    END;
END;

DECLARE @FilterUserId INT = NULL;
DECLARE @FilterRoleId INT = @RoleId;

IF @EmployeeId IS NOT NULL
BEGIN
    SELECT TOP (1)
        @FilterUserId = UserEmployee.UserID
    FROM dbo.TUserEmployee AS UserEmployee
    WHERE UserEmployee.EmployeeID = @EmployeeId
    ORDER BY UserEmployee.UserID DESC;
END;

IF @FilterRoleId IS NULL
    AND @RoleName IS NOT NULL
    AND LTRIM(RTRIM(@RoleName)) <> ''
    AND CHARINDEX('%', @RoleName) = 0
BEGIN
    SELECT TOP (1)
        @FilterRoleId = Roles.RoleID
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

------------------------------------------------------------------------------
-- 0) Filters actually applied
------------------------------------------------------------------------------
SELECT
    'Filters' AS DatasetType,
    @EmployerId AS EmployerId,
    @FilterRoleId AS ResolvedRoleId,
    @RoleName AS RoleNameFilter,
    @EmployeeId AS EmployeeId,
    @FilterUserId AS ResolvedUserId,
    @EmploymentNumber AS EmploymentNumber,
    @MenuName AS MenuNameFilter,
    (
        SELECT COUNT(*)
        FROM dbo.TUserEmployee AS UserEmployee
        WHERE UserEmployee.EmployeeID = @EmployeeId
    ) AS UserEmployeeMappingCount;

------------------------------------------------------------------------------
-- 1) Tenant roles (default Employerid=0 plus this tenant)
------------------------------------------------------------------------------
SELECT
    'Roles' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    Roles.IsDefault,
    Roles.IsActive,
    Roles.Employerid,
    Roles.RoleType,
    Roles.ReportingType AS ReportingTypeRoleId,
    ReportingRole.RoleName AS ReportingTypeName,
    Roles.RoleDescription,
    Roles.IsGlobalAccess,
    (
        SELECT COUNT(*)
        FROM dbo.TRolePagesMapping AS RolePages
        WHERE RolePages.RoleID = Roles.RoleID
            AND RolePages.Employerid = @EmployerId
    ) AS PageGrantCount,
    (
        SELECT COUNT(*)
        FROM dbo.TRoleTabDetails AS RoleTabs
        WHERE RoleTabs.RoleId = Roles.RoleID
            AND RoleTabs.Employerid = @EmployerId
    ) AS RoleTabGrantCount,
    (
        SELECT COUNT(*)
        FROM dbo.TUsers AS Users
        WHERE Users.RoleID = Roles.RoleID
            AND Users.Employerid = @EmployerId
    ) AS UserCount,
    (
        SELECT TOP (1)
            RolePages.LocationIds
        FROM dbo.TRolePagesMapping AS RolePages
        WHERE RolePages.RoleID = Roles.RoleID
            AND RolePages.Employerid = @EmployerId
            AND RolePages.LocationIds IS NOT NULL
    ) AS LocationIds,
    (
        SELECT TOP (1)
            RolePages.BusinessUnitIds
        FROM dbo.TRolePagesMapping AS RolePages
        WHERE RolePages.RoleID = Roles.RoleID
            AND RolePages.Employerid = @EmployerId
            AND RolePages.BusinessUnitIds IS NOT NULL
    ) AS BusinessUnitIds
FROM dbo.TRoles AS Roles
LEFT JOIN dbo.TRoles AS ReportingRole
    ON ReportingRole.RoleID = Roles.ReportingType
WHERE (
        (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
        OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
    )
    AND (
        @FilterRoleId IS NULL
        OR Roles.RoleID = @FilterRoleId
    )
    AND (
        @RoleName IS NULL
        OR LTRIM(RTRIM(@RoleName)) = ''
        OR Roles.RoleName LIKE @RoleName
    )
ORDER BY
    Roles.IsDefault DESC,
    Roles.RoleName;

------------------------------------------------------------------------------
-- 2) Role page + tab grants
------------------------------------------------------------------------------
SELECT
    'RolePageGrants' AS DatasetType,
    RolePages.RoleID,
    Roles.RoleName,
    RolePages.PageId AS MenuId,
    Menu.MenuName,
    Menu.ISActive AS MasterIsActive,
    Menu.NavigateURL,
    RolePages.Employerid,
    RolePages.LocationIds,
    RolePages.BusinessUnitIds,
    RolePages.CreationDate
FROM dbo.TRolePagesMapping AS RolePages
INNER JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = RolePages.RoleID
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = RolePages.PageId
    AND Menu.Employerid = RolePages.Employerid
WHERE RolePages.Employerid = @EmployerId
    AND (
        @FilterRoleId IS NULL
        OR RolePages.RoleID = @FilterRoleId
    )
    AND (
        @RoleName IS NULL
        OR LTRIM(RTRIM(@RoleName)) = ''
        OR Roles.RoleName LIKE @RoleName
    )
    AND (
        @MenuName IS NULL
        OR LTRIM(RTRIM(@MenuName)) = ''
        OR Menu.MenuName LIKE @MenuName
    )
ORDER BY
    Roles.RoleName,
    Menu.MenuName;

SELECT
    'RoleTabGrants_AdminUiOnly' AS DatasetType,
    RoleTabs.RoleId,
    Roles.RoleName,
    RoleTabs.MenuId,
    Menu.MenuName,
    RoleTabs.TabId,
    Tab.TabName,
    Tab.Employerid AS TabMasterEmployerid,
    RoleTabs.IsEditable,
    RoleTabs.Employerid,
    CASE
        WHEN RoleTabs.TabId IS NULL THEN 'Menu-level token (TabId NULL)'
        WHEN Tab.Tabid IS NULL THEN 'TabId not in TTabDetails'
        WHEN Tab.Employerid <> RoleTabs.Employerid
            THEN 'Tab master Employerid does not match — runtime tabs still need TUserTabDetails + matching TTabDetails'
        ELSE 'Role tab is admin-UI state only; runtime reads TUserTabDetails'
    END AS Note
FROM dbo.TRoleTabDetails AS RoleTabs
INNER JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = RoleTabs.RoleId
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = RoleTabs.MenuId
    AND Menu.Employerid = RoleTabs.Employerid
LEFT JOIN dbo.TTabDetails AS Tab
    ON Tab.Tabid = RoleTabs.TabId
WHERE RoleTabs.Employerid = @EmployerId
    AND (
        @FilterRoleId IS NULL
        OR RoleTabs.RoleId = @FilterRoleId
    )
    AND (
        @RoleName IS NULL
        OR LTRIM(RTRIM(@RoleName)) = ''
        OR Roles.RoleName LIKE @RoleName
    )
    AND (
        @MenuName IS NULL
        OR LTRIM(RTRIM(@MenuName)) = ''
        OR Menu.MenuName LIKE @MenuName
    )
ORDER BY
    Roles.RoleName,
    Menu.MenuName,
    Tab.TabName;

------------------------------------------------------------------------------
-- 3) Users assigned to a role
------------------------------------------------------------------------------
SELECT
    'UserRoleAssignments' AS DatasetType,
    Users.UserID,
    EmployeeInfo.EmploymentNumber,
    Users.RoleID,
    Roles.RoleName,
    Users.IsActive,
    Users.IsGlobalAccess,
    Users.ReportingType AS ReportingTypeRoleId,
    ReportingRole.RoleName AS ReportingTypeName,
    Users.EmployerIds AS GlobalEmployerIds,
    Users.Employerid
FROM dbo.TUsers AS Users
LEFT JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = Users.RoleID
LEFT JOIN dbo.TRoles AS ReportingRole
    ON ReportingRole.RoleID = Users.ReportingType
LEFT JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = Users.UserID
LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
    ON EmployeeInfo.EmployeeId = UserEmployee.EmployeeID
WHERE Users.Employerid = @EmployerId
    AND (
        @FilterRoleId IS NULL
        OR Users.RoleID = @FilterRoleId
    )
    AND (
        @FilterUserId IS NULL
        OR Users.UserID = @FilterUserId
    )
ORDER BY
    Roles.RoleName,
    EmployeeInfo.EmploymentNumber;

------------------------------------------------------------------------------
-- 4) Additional user page/tab overrides vs inherited role grants
------------------------------------------------------------------------------
SELECT
    'UserPageOverrides' AS DatasetType,
    UserPages.UserID,
    EmployeeInfo.EmploymentNumber,
    Users.RoleID,
    Roles.RoleName,
    UserPages.PageId AS MenuId,
    Menu.MenuName,
    CASE
        WHEN RolePages.RoleID IS NOT NULL THEN 'Y'
        ELSE 'N'
    END AS AlsoOnRole,
    UserPages.LocationIds,
    UserPages.BusinessUnitIds,
    UserPages.Employerid,
    UserPages.CreationDate
FROM dbo.TUSerPagesMapping AS UserPages
INNER JOIN dbo.TUsers AS Users
    ON Users.UserID = UserPages.UserID
LEFT JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = Users.RoleID
LEFT JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = Users.UserID
LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
    ON EmployeeInfo.EmployeeId = UserEmployee.EmployeeID
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = UserPages.PageId
    AND Menu.Employerid = UserPages.Employerid
LEFT JOIN dbo.TRolePagesMapping AS RolePages
    ON RolePages.RoleID = Users.RoleID
    AND RolePages.PageId = UserPages.PageId
    AND RolePages.Employerid = UserPages.Employerid
WHERE UserPages.Employerid = @EmployerId
    AND (
        @FilterUserId IS NULL
        OR UserPages.UserID = @FilterUserId
    )
    AND (
        @FilterRoleId IS NULL
        OR Users.RoleID = @FilterRoleId
    )
    AND (
        @MenuName IS NULL
        OR LTRIM(RTRIM(@MenuName)) = ''
        OR Menu.MenuName LIKE @MenuName
    )
ORDER BY
    EmployeeInfo.EmploymentNumber,
    Menu.MenuName;

SELECT
    'UserTabGrants_Runtime' AS DatasetType,
    UserTabs.UserId,
    EmployeeInfo.EmploymentNumber,
    UserTabs.MenuId,
    Menu.MenuName,
    UserTabs.TabId,
    Tab.TabName,
    Tab.Employerid AS TabMasterEmployerid,
    UserTabs.IsEditable,
    UserTabs.Employerid,
    CASE
        WHEN UserTabs.TabId IS NULL THEN 'Menu-level token (TabId NULL) — not a runtime tab'
        WHEN Tab.Tabid IS NULL THEN 'TabId not in TTabDetails — runtime will hide it'
        WHEN Tab.Employerid <> UserTabs.Employerid
            THEN 'TTabDetails.Employerid mismatch — Sp_Get_UserMenuTab_Details returns no tab'
        ELSE 'Would show if TTabDetails.IsActive = Y and the page is reachable'
    END AS RuntimeNote
FROM dbo.TUserTabDetails AS UserTabs
LEFT JOIN dbo.TUserEmployee AS UserEmployee
    ON UserEmployee.UserID = UserTabs.UserId
LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
    ON EmployeeInfo.EmployeeId = UserEmployee.EmployeeID
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = UserTabs.MenuId
    AND Menu.Employerid = UserTabs.Employerid
LEFT JOIN dbo.TTabDetails AS Tab
    ON Tab.Tabid = UserTabs.TabId
WHERE UserTabs.Employerid = @EmployerId
    AND (
        @FilterUserId IS NULL
        OR UserTabs.UserId = @FilterUserId
    )
    AND (
        @MenuName IS NULL
        OR LTRIM(RTRIM(@MenuName)) = ''
        OR Menu.MenuName LIKE @MenuName
    )
ORDER BY
    EmployeeInfo.EmploymentNumber,
    Menu.MenuName,
    Tab.TabName;

------------------------------------------------------------------------------
-- 5) Employee summary permissions
------------------------------------------------------------------------------
SELECT
    'EmployeeSummaryPermissions' AS DatasetType,
    Summary.RoleWisePageId,
    Summary.RoleId,
    Roles.RoleName,
    Summary.Menuid,
    Menu.MenuName,
    Summary.Tabid,
    Tab.TabName,
    Summary.ActiveFlag,
    Summary.InActiveFlag,
    Summary.EmployeeIds,
    Summary.EmployerId,
    Summary.ModifiedDate
FROM dbo.TRollWisePageAccess AS Summary
LEFT JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = Summary.RoleId
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = Summary.Menuid
    AND Menu.Employerid = Summary.EmployerId
LEFT JOIN dbo.TTabDetails AS Tab
    ON Tab.Tabid = Summary.Tabid
WHERE Summary.EmployerId = @EmployerId
    AND (
        @FilterRoleId IS NULL
        OR Summary.RoleId = @FilterRoleId
    )
    AND (
        @RoleName IS NULL
        OR LTRIM(RTRIM(@RoleName)) = ''
        OR Roles.RoleName LIKE @RoleName
    )
ORDER BY
    Roles.RoleName,
    Menu.MenuName,
    Tab.TabName;

------------------------------------------------------------------------------
-- 6) Pending ARM admin-change requests (informational — these scripts skip them)
------------------------------------------------------------------------------
SELECT
    'PendingArmAdminChanges' AS DatasetType,
    Approvals.ChangeRequestID,
    Approvals.PageName,
    Approvals.RequestType,
    Approvals.ActionType,
    Approvals.ActionStatus,
    Approvals.ActionFor,
    Approvals.TableName,
    Approvals.TableId,
    Approvals.EmployerId,
    Approvals.CreatedBy,
    Approvals.CreatedDate
FROM dbo.TAdminChangesApprovals AS Approvals
WHERE Approvals.EmployerId = @EmployerId
    AND Approvals.RequestType IN (
        'RoleAccessRightManagement',
        'RolesPermissions',
        'RolesPermissions_New',
        'UserAccessRightManagement',
        'UsersPermissions',
        'EmployeeSummaryPermissions'
    )
    AND (
        Approvals.ActionStatus IS NULL
        OR Approvals.ActionStatus IN ('Pending', 'P', 'pending')
    )
ORDER BY
    Approvals.CreatedDate DESC;

------------------------------------------------------------------------------
-- 7) TTabDetails tenant-gap check
------------------------------------------------------------------------------
SELECT
    'TabMasterTenantCheck' AS DatasetType,
    @EmployerId AS EmployerId,
    (
        SELECT COUNT(*)
        FROM dbo.TTabDetails AS Tab
        WHERE Tab.Employerid = @EmployerId
    ) AS TabDetailsRowCount,
    (
        SELECT COUNT(*)
        FROM dbo.TUserTabDetails AS UserTabs
        WHERE UserTabs.Employerid = @EmployerId
    ) AS UserTabGrantCount,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM dbo.TTabDetails AS Tab
            WHERE Tab.Employerid = @EmployerId
        )
            THEN 'TTabDetails has rows for this employer'
        ELSE 'NO TTabDetails rows for this employer — Sp_Get_UserMenuTab_Details returns zero tabs for every user (known gap outside employers 0/1/10)'
    END AS LikelyCause;
