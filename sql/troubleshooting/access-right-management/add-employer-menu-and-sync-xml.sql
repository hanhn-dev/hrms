-- =============================================================================
-- add-employer-menu-and-sync-xml.sql
--
-- Purpose:  Add (or activate) one existing template menu for a tenant and
--           surgically insert it into TDynamicMenuHierarchy so the
--           RoleManagement.aspx Dynamic Menu / page-access trees can see it.
--
-- UI:       RoleManagement.aspx → Dynamic Menu → add node → Submit
--           The UI SP (sp_InsertDynamicMenuHierarchy) WIPES the employer's
--           entire tMenuDetails / TMenuHierarchy / TDynamicMenuHierarchy.
--           This script does not.
--
-- Pattern:  seeding/menu/CreateMenuItem.XmlSync.sql — XQuery .modify() one
--           node, CAST through NVARCHAR(MAX) because the stored prolog is
--           encoding="utf-16" on a VARCHAR column.
--
-- WRITE script. Does not grant the menu to a role or user — run
--           grant-or-revoke-role-menus.sql afterwards. Does not create a
--           brand-new global MenuId; it copies Employerid = 0.
--
-- Inputs:   @EmployerId     required (target tenant)
--           @MenuId         required unless @MenuName is set (template MenuId)
--           @MenuName       lookup on Employerid = 0 if @MenuId is 0
--           @ActivateOnly   Y = only flip tMenuDetails.ISActive = 1
--           @CreatedBy      required audit id
--
-- Diagnose first: ../menu/menu-created-but-not-visible/diagnose-menu-setup-by-employer.sql
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                 -- <<< REQUIRED target tenant
DECLARE @MenuId INT = 0;                     -- <<< template MenuId (Employerid = 0)
DECLARE @MenuName VARCHAR(200) = '';         -- <<< lookup if @MenuId = 0
DECLARE @ActivateOnly CHAR(1) = 'N';         -- Y = only reactivate
DECLARE @CreatedBy INT = 0;                  -- <<< REQUIRED

IF @EmployerId <= 0
    OR @CreatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @CreatedBy before running.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TEmployerDetails
    WHERE Employerid = @EmployerId
)
BEGIN
    THROW 50000, '@EmployerId was not found in TEmployerDetails.', 1;
END;

IF @MenuId <= 0
    AND NULLIF(LTRIM(RTRIM(@MenuName)), '') IS NULL
BEGIN
    THROW 50000, 'Set @MenuId or @MenuName (the Employerid = 0 template item).', 1;
END;

IF @MenuId <= 0
BEGIN
    SELECT TOP (1)
        @MenuId = Menu.MenuId
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.MenuName = LTRIM(RTRIM(@MenuName))
        AND Menu.Employerid = 0
    ORDER BY Menu.MenuId;
END;

IF @MenuId IS NULL
    OR @MenuId <= 0
    OR NOT EXISTS (
        SELECT 1
        FROM dbo.tMenuDetails AS Menu
        WHERE Menu.MenuId = @MenuId
            AND Menu.Employerid = 0
    )
BEGIN
    THROW 50000, 'Template menu (Employerid = 0) was not found. This script copies an existing global MenuId; it does not create a new one.', 1;
END;

DECLARE @TemplateName VARCHAR(200);
DECLARE @TemplateUrl VARCHAR(1000);
DECLARE @TemplatePage VARCHAR(200);
DECLARE @TemplateIcon VARCHAR(200);
DECLARE @TemplateActive BIT;

SELECT
    @TemplateName = Menu.MenuName,
    @TemplateUrl = Menu.NavigateURL,
    @TemplatePage = Menu.PageName,
    @TemplateIcon = Menu.iconname,
    @TemplateActive = Menu.ISActive
FROM dbo.tMenuDetails AS Menu
WHERE Menu.MenuId = @MenuId
    AND Menu.Employerid = 0;

DECLARE @TemplateParentMenuId INT;
DECLARE @TemplateParentSeq INT;

SELECT
    @TemplateParentMenuId = Hierarchy.ParentMenuId,
    @TemplateParentSeq = Hierarchy.parentseq
FROM dbo.TMenuHierarchy AS Hierarchy
WHERE Hierarchy.MenuId = @MenuId
    AND Hierarchy.Employerid = 0;

DECLARE @ParentMenuIdForTable INT = @TemplateParentMenuId;
DECLARE @ParentValueForXml VARCHAR(20) = CASE
    WHEN @TemplateParentMenuId IS NULL
        OR @TemplateParentMenuId = 0
        THEN '1'
    ELSE CAST(@TemplateParentMenuId AS VARCHAR(20))
END;

IF @ParentMenuIdForTable IS NOT NULL
    AND @ParentMenuIdForTable > 1
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.tMenuDetails AS Menu
        INNER JOIN dbo.TMenuHierarchy AS Hierarchy
            ON Hierarchy.MenuId = Menu.MenuId
            AND Hierarchy.Employerid = Menu.Employerid
        WHERE Menu.MenuId = @ParentMenuIdForTable
            AND Menu.Employerid = @EmployerId
    )
BEGIN
    THROW 50000, 'The template parent MenuId is not on this employer yet. Add the parent first, then re-run for this child.', 1;
END;

DECLARE @TenantExists BIT = CASE
    WHEN EXISTS (
        SELECT 1
        FROM dbo.tMenuDetails AS Menu
        WHERE Menu.MenuId = @MenuId
            AND Menu.Employerid = @EmployerId
    )
        THEN 1
    ELSE 0
END;

IF UPPER(@ActivateOnly) = 'Y'
    AND @TenantExists = 0
BEGIN
    THROW 50000, '@ActivateOnly = Y requires an existing tMenuDetails row for this employer. Leave @ActivateOnly = N to copy from Employerid = 0.', 1;
END;

DECLARE @CurrentXmlVarchar VARCHAR(MAX) = (
    SELECT TOP (1)
        DynamicMenu.DynamicMenuXML
    FROM dbo.TDynamicMenuHierarchy AS DynamicMenu
    WHERE DynamicMenu.employerid = @EmployerId
    ORDER BY DynamicMenu.Transid DESC
);

IF @CurrentXmlVarchar IS NULL
BEGIN
    THROW 50000, 'No TDynamicMenuHierarchy row exists for this employer. The admin tree cache must exist before a surgical XML insert. Seed it from the UI once, or copy an Employerid = 0 blob, before using this script.', 1;
END;

DECLARE @CurrentXml XML = CAST(CAST(@CurrentXmlVarchar AS NVARCHAR(MAX)) AS XML);
DECLARE @MenuIdStr VARCHAR(20) = CAST(@MenuId AS VARCHAR(20));
DECLARE @XmlHasNode BIT = @CurrentXml.exist('(//Node[@Value=sql:variable("@MenuIdStr")])[1]');
DECLARE @XmlHasParent BIT = @CurrentXml.exist('(//Node[@Value=sql:variable("@ParentValueForXml")])[1]');

IF @XmlHasParent = 0
BEGIN
    THROW 50000, 'The XML parent node was not found in TDynamicMenuHierarchy. Tables and the admin cache have drifted — run ../menu/menu-created-but-not-visible/diagnose-menu-setup-by-employer.sql before continuing.', 1;
END;

SELECT
    'Template' AS DatasetType,
    @MenuId AS MenuId,
    @TemplateName AS MenuName,
    @TemplateUrl AS NavigateURL,
    @TemplatePage AS PageName,
    @TemplateParentMenuId AS ParentMenuId,
    @TemplateActive AS TemplateIsActive;

SELECT
    'TenantBefore' AS DatasetType,
    Menu.MenuId,
    Menu.MenuName,
    Menu.ISActive,
    Menu.Employerid,
    Hierarchy.ParentMenuId,
    Hierarchy.parentseq,
    @XmlHasNode AS XmlAlreadyHasNode
FROM dbo.tMenuDetails AS Menu
LEFT JOIN dbo.TMenuHierarchy AS Hierarchy
    ON Hierarchy.MenuId = Menu.MenuId
    AND Hierarchy.Employerid = Menu.Employerid
WHERE Menu.MenuId = @MenuId
    AND Menu.Employerid = @EmployerId;

BEGIN TRANSACTION;

IF UPPER(@ActivateOnly) = 'Y'
    OR @TenantExists = 1
BEGIN
    UPDATE dbo.tMenuDetails
    SET
        ISActive = 1
    WHERE MenuId = @MenuId
        AND Employerid = @EmployerId
        AND ISActive = 0;
END;

IF @TenantExists = 0
    AND UPPER(@ActivateOnly) <> 'Y'
BEGIN
    INSERT INTO dbo.tMenuDetails (
        MenuId,
        MenuName,
        NavigateURL,
        PageName,
        ISActive,
        Employerid,
        CreatedBy,
        CreatedDate,
        iconname
    )
    VALUES (
        @MenuId,
        @TemplateName,
        @TemplateUrl,
        @TemplatePage,
        1,
        @EmployerId,
        @CreatedBy,
        GETDATE(),
        @TemplateIcon
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TMenuHierarchy AS Hierarchy
    WHERE Hierarchy.MenuId = @MenuId
        AND Hierarchy.Employerid = @EmployerId
)
    AND UPPER(@ActivateOnly) <> 'Y'
BEGIN
    DECLARE @ParentSeq INT = COALESCE(
        @TemplateParentSeq,
        (
            SELECT ISNULL(MAX(Hierarchy.parentseq), 0) + 1
            FROM dbo.TMenuHierarchy AS Hierarchy
            WHERE Hierarchy.Employerid = @EmployerId
                AND (
                    (Hierarchy.ParentMenuId IS NULL AND @ParentMenuIdForTable IS NULL)
                    OR Hierarchy.ParentMenuId = @ParentMenuIdForTable
                )
        )
    );

    INSERT INTO dbo.TMenuHierarchy (
        MenuId,
        ParentMenuId,
        CreateDate,
        CreatedBy,
        Employerid,
        parentseq
    )
    VALUES (
        @MenuId,
        @ParentMenuIdForTable,
        GETDATE(),
        @CreatedBy,
        @EmployerId,
        @ParentSeq
    );
END;

IF @XmlHasNode = 0
BEGIN
    INSERT INTO dbo.TDynamicMenuHierarchyHistory (
        Transid,
        DynamicMenuXML,
        Createdby,
        Createdate,
        Lastupdateby,
        Lastupdatedate,
        employerid
    )
    SELECT
        DynamicMenu.Transid,
        DynamicMenu.DynamicMenuXML,
        DynamicMenu.Createdby,
        DynamicMenu.Createdate,
        DynamicMenu.Lastupdateby,
        DynamicMenu.Lastupdatedate,
        DynamicMenu.employerid
    FROM dbo.TDynamicMenuHierarchy AS DynamicMenu
    WHERE DynamicMenu.employerid = @EmployerId;

    DECLARE @UpdatedXml XML = @CurrentXml;
    DECLARE @NodeText VARCHAR(200) = @TemplateName;

    SET @UpdatedXml.modify('
        insert <Node Text="{sql:variable("@NodeText")}" Value="{sql:variable("@MenuIdStr")}" Expanded="False"/>
        as last into (//Node[@Value=sql:variable("@ParentValueForXml")])[1]
    ');

    DECLARE @UpdatedXmlText VARCHAR(MAX) = '<?xml version="1.0" encoding="utf-16"?>'
        + CHAR(13)
        + CHAR(10)
        + CAST(CAST(@UpdatedXml AS NVARCHAR(MAX)) AS VARCHAR(MAX));

    DELETE
    FROM dbo.TDynamicMenuHierarchy
    WHERE employerid = @EmployerId;

    INSERT INTO dbo.TDynamicMenuHierarchy (
        DynamicMenuXML,
        Createdby,
        Createdate,
        employerid
    )
    VALUES (
        @UpdatedXmlText,
        @CreatedBy,
        GETDATE(),
        @EmployerId
    );
END;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'TenantAfter' AS DatasetType,
    Menu.MenuId,
    Menu.MenuName,
    Menu.ISActive,
    Menu.NavigateURL,
    Menu.PageName,
    Hierarchy.ParentMenuId,
    Hierarchy.parentseq
FROM dbo.tMenuDetails AS Menu
LEFT JOIN dbo.TMenuHierarchy AS Hierarchy
    ON Hierarchy.MenuId = Menu.MenuId
    AND Hierarchy.Employerid = Menu.Employerid
WHERE Menu.MenuId = @MenuId
    AND Menu.Employerid = @EmployerId;

SELECT
    CAST(
        CAST(
            CAST((
                SELECT TOP (1)
                    DynamicMenu.DynamicMenuXML
                FROM dbo.TDynamicMenuHierarchy AS DynamicMenu
                WHERE DynamicMenu.employerid = @EmployerId
                ORDER BY DynamicMenu.Transid DESC
            ) AS NVARCHAR(MAX)) AS XML
        ).query('(//Node[@Value=sql:variable("@MenuIdStr")])[1]')
        AS NVARCHAR(1000)
    ) AS NodeInStoredXml;

PRINT 'Menu is still invisible in the sidebar until a role/user grant exists (grant-or-revoke-role-menus.sql). Users must re-login.';
PRINT 'Uncomment COMMIT TRANSACTION after review.';
