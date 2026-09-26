-- =============================================================================
-- set-employee-summary-permissions.sql
--
-- Purpose:  Upsert one TRollWisePageAccess row for a role (Active / Inactive
--           employee-summary flags plus the employee list). Same live table as
--           Employee Summary Permissions → Submit, without
--           SP_AdminRoleM_InsEmpSummaryAccessMap (no workflow, no TVP wipe).
--
-- UI:       RoleManagement.aspx → Employee Summary Permissions → Submit
--
-- WRITE script. The UI disables Submit when the role has no menu/tab mapping;
--           this script requires the role to already have @MenuId in
--           TRolePagesMapping for the employer.
--
-- Inputs:   @EmployerId     required
--           @RoleId         required unless @RoleName is set
--           @RoleName       lookup if @RoleId is 0
--           @MenuId         required unless @MenuName is set
--           @MenuName       lookup if @MenuId is 0
--           @TabId          required unless @TabName is set (0 = menu-level)
--           @TabName        lookup if @TabId is 0 and you want a named tab
--           @ActiveFlag     Y or N
--           @InActiveFlag   Y or N
--           @EmployeeIds    comma-separated TEmployee.EmployeeId values
--           @CreatedBy      required audit id
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                 -- <<< REQUIRED
DECLARE @RoleId INT = 0;                     -- <<< required unless @RoleName
DECLARE @RoleName VARCHAR(100) = '';
DECLARE @MenuId INT = 0;                     -- <<< required unless @MenuName
DECLARE @MenuName VARCHAR(200) = '';
DECLARE @TabId INT = NULL;                   -- NULL / 0 = menu-level row
DECLARE @TabName VARCHAR(500) = '';
DECLARE @ActiveFlag CHAR(1) = 'Y';
DECLARE @InActiveFlag CHAR(1) = 'N';
DECLARE @EmployeeIds VARCHAR(MAX) = '';      -- <<< comma EmployeeIds
DECLARE @CreatedBy INT = 0;                  -- <<< REQUIRED

IF @EmployerId <= 0
    OR @CreatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @CreatedBy before running.', 1;
END;

IF UPPER(@ActiveFlag) NOT IN ('Y', 'N')
    OR UPPER(@InActiveFlag) NOT IN ('Y', 'N')
BEGIN
    THROW 50000, '@ActiveFlag and @InActiveFlag must be Y or N.', 1;
END;

IF @RoleId <= 0
    AND NULLIF(LTRIM(RTRIM(@RoleName)), '') IS NULL
BEGIN
    THROW 50000, 'Set @RoleId or @RoleName.', 1;
END;

IF @MenuId <= 0
    AND NULLIF(LTRIM(RTRIM(@MenuName)), '') IS NULL
BEGIN
    THROW 50000, 'Set @MenuId or @MenuName.', 1;
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
BEGIN
    THROW 50000, 'Role was not found for this tenant.', 1;
END;

IF @MenuId <= 0
BEGIN
    SELECT TOP (1)
        @MenuId = Menu.MenuId
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.MenuName = LTRIM(RTRIM(@MenuName))
        AND Menu.Employerid = @EmployerId
        AND Menu.ISActive = 1
    ORDER BY Menu.MenuId;
END;

IF @MenuId IS NULL
    OR @MenuId <= 0
BEGIN
    THROW 50000, 'Menu was not found (or is inactive) for this employer.', 1;
END;

IF @TabId IS NULL
    AND NULLIF(LTRIM(RTRIM(@TabName)), '') IS NOT NULL
BEGIN
    SELECT TOP (1)
        @TabId = Tab.Tabid
    FROM dbo.TTabDetails AS Tab
    WHERE Tab.TabName = LTRIM(RTRIM(@TabName))
        AND Tab.MenuId = @MenuId
        AND Tab.Employerid = @EmployerId
    ORDER BY Tab.Tabid;
END;

IF @TabId IS NOT NULL
    AND @TabId <= 0
BEGIN
    SET @TabId = NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TRolePagesMapping AS RolePages
    WHERE RolePages.RoleID = @RoleId
        AND RolePages.PageId = @MenuId
        AND RolePages.Employerid = @EmployerId
)
BEGIN
    THROW 50000, 'Role does not have this MenuId in TRolePagesMapping. Grant the menu first (grant-or-revoke-role-menus.sql). The UI disables Submit in that case.', 1;
END;

SELECT
    'CurrentEmployeeSummaryRow' AS DatasetType,
    Summary.RoleWisePageId,
    Summary.RoleId,
    Summary.Menuid,
    Summary.Tabid,
    Summary.ActiveFlag,
    Summary.InActiveFlag,
    Summary.EmployeeIds
FROM dbo.TRollWisePageAccess AS Summary
WHERE Summary.RoleId = @RoleId
    AND Summary.EmployerId = @EmployerId
    AND Summary.Menuid = @MenuId
    AND (
        (Summary.Tabid IS NULL AND @TabId IS NULL)
        OR Summary.Tabid = @TabId
    );

SELECT
    'ProposedEmployeeSummaryRow' AS DatasetType,
    @RoleId AS RoleId,
    @MenuId AS MenuId,
    @TabId AS TabId,
    UPPER(@ActiveFlag) AS ActiveFlag,
    UPPER(@InActiveFlag) AS InActiveFlag,
    NULLIF(LTRIM(RTRIM(@EmployeeIds)), '') AS EmployeeIds;

BEGIN TRANSACTION;

DECLARE @HistoryTransId INT = (
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
    @HistoryTransId,
    Summary.RoleId,
    Summary.PageModuleId,
    Summary.ActiveFlag,
    Summary.InActiveFlag,
    Summary.EmployerId,
    Summary.CreatedBy,
    Summary.CreatedDate,
    ISNULL(Summary.ModifiedBy, Summary.CreatedBy),
    ISNULL(Summary.ModifiedDate, Summary.CreatedDate),
    Summary.Tabid,
    Summary.Menuid,
    GETUTCDATE(),
    Summary.EmployeeIds
FROM dbo.TRollWisePageAccess AS Summary
WHERE Summary.RoleId = @RoleId
    AND Summary.EmployerId = @EmployerId
    AND Summary.Menuid = @MenuId
    AND (
        (Summary.Tabid IS NULL AND @TabId IS NULL)
        OR Summary.Tabid = @TabId
    );

IF EXISTS (
    SELECT 1
    FROM dbo.TRollWisePageAccess AS Summary
    WHERE Summary.RoleId = @RoleId
        AND Summary.EmployerId = @EmployerId
        AND Summary.Menuid = @MenuId
        AND (
            (Summary.Tabid IS NULL AND @TabId IS NULL)
            OR Summary.Tabid = @TabId
        )
)
BEGIN
    UPDATE dbo.TRollWisePageAccess
    SET
        ActiveFlag = UPPER(@ActiveFlag),
        InActiveFlag = UPPER(@InActiveFlag),
        EmployeeIds = NULLIF(LTRIM(RTRIM(@EmployeeIds)), ''),
        ModifiedBy = @CreatedBy,
        ModifiedDate = GETDATE()
    WHERE RoleId = @RoleId
        AND EmployerId = @EmployerId
        AND Menuid = @MenuId
        AND (
            (Tabid IS NULL AND @TabId IS NULL)
            OR Tabid = @TabId
        );
END;
ELSE
BEGIN
    INSERT INTO dbo.TRollWisePageAccess (
        RoleId,
        ActiveFlag,
        InActiveFlag,
        EmployerId,
        CreatedBy,
        CreatedDate,
        ModifiedBy,
        ModifiedDate,
        Tabid,
        Menuid,
        CreationDateUtcTime,
        EmployeeIds
    )
    VALUES (
        @RoleId,
        UPPER(@ActiveFlag),
        UPPER(@InActiveFlag),
        @EmployerId,
        @CreatedBy,
        GETDATE(),
        @CreatedBy,
        GETDATE(),
        @TabId,
        @MenuId,
        GETUTCDATE(),
        NULLIF(LTRIM(RTRIM(@EmployeeIds)), '')
    );
END;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'EmployeeSummaryAfter' AS DatasetType,
    Summary.RoleWisePageId,
    Summary.RoleId,
    Roles.RoleName,
    Summary.Menuid,
    Menu.MenuName,
    Summary.Tabid,
    Tab.TabName,
    Summary.ActiveFlag,
    Summary.InActiveFlag,
    Summary.EmployeeIds
FROM dbo.TRollWisePageAccess AS Summary
LEFT JOIN dbo.TRoles AS Roles
    ON Roles.RoleID = Summary.RoleId
LEFT JOIN dbo.tMenuDetails AS Menu
    ON Menu.MenuId = Summary.Menuid
    AND Menu.Employerid = Summary.EmployerId
LEFT JOIN dbo.TTabDetails AS Tab
    ON Tab.Tabid = Summary.Tabid
WHERE Summary.RoleId = @RoleId
    AND Summary.EmployerId = @EmployerId
    AND Summary.Menuid = @MenuId
    AND (
        (Summary.Tabid IS NULL AND @TabId IS NULL)
        OR Summary.Tabid = @TabId
    );

PRINT 'Uncomment COMMIT TRANSACTION after review.';
