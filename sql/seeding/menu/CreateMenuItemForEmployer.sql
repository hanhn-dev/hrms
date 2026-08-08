/* =============================================================================
   Create a brand-new menu item the way production actually originates one --
   at Employerid = 0 (the base/template org) -- then make it appear for ONE
   specific target employer, in a single script/transaction.

   This mirrors the real two-stage flow confirmed in MenuManagerBLL.js:
     1. processMenuConfiguration only ever INSERTs brand-new TMenuDetails rows
        into Employerid = 0.
     2. _copyMenuConfiguration then makes an item available to a target
        employer by copying from employer 0 (MenuManagerDAL.copyMenuItems /
        copyMenuHierarchies: `INSERT INTO TMenuDetails (MenuId, MenuName,
        NavigateURL, PageName, ISActive, EmployerId, CreatedBy, CreatedDate,
        iconname, TabName) SELECT ... FROM TMenuDetails WHERE
        EmployerId=@Source`, same shape for TMenuHierarchy).

   DELIBERATE DEVIATION FROM PRODUCTION, READ BEFORE RUNNING:
   The real _copyMenuConfiguration DELETES ALL of the target employer's
   existing tMenuDetails/TMenuHierarchy rows and rebuilds the ENTIRE tree from
   employer 0, filtered by that employer's licensed modules (TEmployerModule /
   workflow categories). That is a full wipe-and-reset of the target
   employer's whole menu configuration, by design (production always treats a
   tenant's menu as "whatever employer 0 has, filtered by their license").
   Replicating that exactly here would be destructive to run repeatedly
   against a shared dev employer and requires modeling the module-license
   filtering this script does not implement. Instead, Stage 2 below does an
   ADDITIVE copy of ONLY the one new MenuId into the target employer --
   nothing else already in that employer's tree is touched. This means a
   tenant's licensed-module filtering is NOT re-evaluated here; you are
   directly granting this one item regardless of module licensing.

   Both stages run in ONE transaction: if target-employer validation fails
   (e.g. @ParentMenuId doesn't exist there), NOTHING is written, including at
   employer 0 -- avoids leaving a half-finished item behind.

   TDynamicMenuHierarchy XML is kept in sync at employer 0 always (it always
   has a tree). For the target employer, XML is synced ONLY if that employer
   already has a TDynamicMenuHierarchy row -- 7 employers in this DB
   currently have none at all (confirmed by querying it directly; includes
   the PERFTEST employers seed-new-employer-performance-test.sql creates,
   which is exactly why fix-perftest-menu-access.sql exists as a separate
   patch script). If the target has no XML row, this script still populates
   its tMenuDetails/TMenuHierarchy rows (so the real sidebar renders the item
   via sp_GetDynamicMenuItems, which never reads the XML anyway) but skips
   the XML step and prints a warning -- Access Rights Management will still
   show that employer's menu tree as empty regardless of this script, which
   is a pre-existing condition, not something this script should silently
   invent a fix for.

   Uses the same NVARCHAR(MAX) hop before casting to XML as
   CreateMenuItem.XmlSync.sql -- casting the raw VARCHAR(MAX) directly fails
   with "XML parsing: unable to switch the encoding" (confirmed against live
   data) because of the stored encoding="utf-16" prolog.

   Still requires AssignMenuAccess.sql (or the Access Rights Management UI,
   now that the item is visible there for employers with an XML tree) to
   grant a role/user access -- this script only creates and propagates the
   item, it does not grant anyone permission to see it.

   To remove what this script creates, see ./CreateMenuItemForEmployer.cleanup.sql.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these, then run the whole script
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT           = 0;         -- <<< the tenant Employerid this item should appear for (must NOT be 0)
DECLARE @MenuName         VARCHAR(200)  = 'TEST Menu Item';  -- <<< label shown in the sidebar / Access Rights tree
DECLARE @NavigateURL      VARCHAR(1000) = '';         -- <<< e.g. 'HRM/Settings/SomePage.aspx'
DECLARE @PageName         VARCHAR(200)  = '';         -- <<< e.g. 'SomePage.aspx'
DECLARE @IconName         VARCHAR(200)  = '';         -- <<< CSS icon class, see getLogoClass() in SiteMain.Master.cs; blank is fine for a test
DECLARE @ParentMenuId     INT           = 0;          -- <<< 0 = top-level; otherwise an existing MenuId in BOTH employer 0's AND the target employer's tree
DECLARE @ModuleId         INT           = NULL;       -- <<< NULL = "general" item (IsDefault=1); or an existing THrmsModules.ModuleId
DECLARE @CreatedBy        INT           = 1;           -- <<< an EmployeeId/UserId to attribute as creator (audit column only)

------------------------------------------------------------------------------
-- 2. VALIDATION -- everything checked BEFORE any write, so a target-employer
--    problem never leaves a half-created item sitting at employer 0
------------------------------------------------------------------------------
IF @TargetEmployerId = 0
    THROW 50000, '@TargetEmployerId must not be 0 -- this script always creates at 0 first, then propagates to a DIFFERENT target employer. To only create at employer 0, use CreateMenuItem.XmlSync.sql (or CreateMenuItem.sql) with @TargetEmployerId = 0 instead.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TargetEmployerId)
    THROW 50000, '@TargetEmployerId does not exist in TEmployerDetails.', 1;
IF ISNULL(LTRIM(RTRIM(@MenuName)), '') = ''
    THROW 50000, '@MenuName is required.', 1;
IF @ModuleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.THrmsModules WHERE ModuleId = @ModuleId)
    THROW 50000, '@ModuleId does not exist in THrmsModules.', 1;

DECLARE @ParentMenuIdForTable INT = CASE WHEN @ParentMenuId = 0 THEN NULL ELSE @ParentMenuId END;
DECLARE @ParentValueForXml    VARCHAR(20) = CASE WHEN @ParentMenuId = 0 THEN '1' ELSE CAST(@ParentMenuId AS VARCHAR(20)) END;

-- 2a. Parent must exist at employer 0 (that's where the item is actually created)
IF @ParentMenuId <> 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = 0 AND mh.MenuId = @ParentMenuId
)
    THROW 50000, '@ParentMenuId does not exist at Employerid = 0 -- new items are always created there first. Check the MenuId, or use 0 for a top-level item.', 1;

-- 2b. Parent must ALSO already exist for the target employer, so the copy has somewhere to attach
IF @ParentMenuId <> 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = @TargetEmployerId AND mh.MenuId = @ParentMenuId
)
    THROW 50000, '@ParentMenuId exists at employer 0 but NOT for @TargetEmployerId -- this tenant''s tree does not have that branch (possibly module-gated). This script does not create parent chains; pick a parent that already exists for both, or use a top-level item (@ParentMenuId = 0).', 1;

-- 2c. Duplicate-sibling check at employer 0 (same rule AddMenu.jsx enforces in the real admin tool)
IF EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = 0
      AND ((mh.ParentMenuId IS NULL AND @ParentMenuIdForTable IS NULL) OR mh.ParentMenuId = @ParentMenuIdForTable)
      AND md.MenuName = @MenuName
      AND md.ISActive = 1
)
    THROW 50000, 'A menu item with this @MenuName already exists under the same @ParentMenuId at Employerid = 0.', 1;

DECLARE @BaseXmlVarchar VARCHAR(MAX) = (
    SELECT TOP (1) DynamicMenuXML FROM dbo.TDynamicMenuHierarchy WHERE employerid = 0 ORDER BY Transid DESC
);
IF @BaseXmlVarchar IS NULL
    THROW 50000, 'Employerid = 0 has no TDynamicMenuHierarchy row -- unexpected, investigate before proceeding.', 1;

DECLARE @BaseXml XML = CAST(CAST(@BaseXmlVarchar AS NVARCHAR(MAX)) AS XML);  -- NVARCHAR hop avoids "unable to switch the encoding"
IF @BaseXml.exist('(//Node[@Value=sql:variable("@ParentValueForXml")])[1]') = 0
    THROW 50000, '@ParentMenuId (or the top-level root, Value="1") was not found in employer 0''s current TDynamicMenuHierarchy XML -- the XML and the tables have drifted apart. Investigate before using this script.', 1;

DECLARE @TargetXmlVarchar VARCHAR(MAX) = (
    SELECT TOP (1) DynamicMenuXML FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId ORDER BY Transid DESC
);
DECLARE @TargetXml XML = NULL;
IF @TargetXmlVarchar IS NOT NULL
BEGIN
    SET @TargetXml = CAST(CAST(@TargetXmlVarchar AS NVARCHAR(MAX)) AS XML);
    IF @TargetXml.exist('(//Node[@Value=sql:variable("@ParentValueForXml")])[1]') = 0
        THROW 50000, '@ParentMenuId exists in the target employer''s tMenuDetails/TMenuHierarchy but not in its TDynamicMenuHierarchy XML -- that employer''s XML and tables have drifted apart. Investigate before using this script.', 1;
END

------------------------------------------------------------------------------
-- 3. CREATE + PROPAGATE (one transaction: all-or-nothing)
------------------------------------------------------------------------------
DECLARE @NewMenuId INT = (SELECT ISNULL(MAX(MenuId), 0) + 1 FROM dbo.tMenuDetails);
DECLARE @NewMenuIdStr VARCHAR(20) = CAST(@NewMenuId AS VARCHAR(20));

DECLARE @BaseParentSeq INT = (
    SELECT ISNULL(MAX(parentseq), 0) + 1 FROM dbo.TMenuHierarchy
    WHERE Employerid = 0 AND ((ParentMenuId IS NULL AND @ParentMenuIdForTable IS NULL) OR ParentMenuId = @ParentMenuIdForTable)
);
DECLARE @TargetParentSeq INT = (
    SELECT ISNULL(MAX(parentseq), 0) + 1 FROM dbo.TMenuHierarchy
    WHERE Employerid = @TargetEmployerId AND ((ParentMenuId IS NULL AND @ParentMenuIdForTable IS NULL) OR ParentMenuId = @ParentMenuIdForTable)
);

BEGIN TRAN CreateMenuItemForEmployer;

    ----------------------------------------------------------------------
    -- Stage 1: create at Employerid = 0
    ----------------------------------------------------------------------
    INSERT INTO dbo.TDynamicMenuHierarchyHistory (Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid)
    SELECT Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid
    FROM dbo.TDynamicMenuHierarchy WHERE employerid = 0;

    DECLARE @UpdatedBaseXml XML = @BaseXml;
    SET @UpdatedBaseXml.modify('
        insert <Node Text="{sql:variable("@MenuName")}" Value="{sql:variable("@NewMenuIdStr")}" Expanded="False"/>
        as last into (//Node[@Value=sql:variable("@ParentValueForXml")])[1]
    ');
    DECLARE @UpdatedBaseXmlText VARCHAR(MAX) = '<?xml version="1.0" encoding="utf-16"?>' + CHAR(13) + CHAR(10)
        + CAST(CAST(@UpdatedBaseXml AS NVARCHAR(MAX)) AS VARCHAR(MAX));

    DELETE FROM dbo.TDynamicMenuHierarchy WHERE employerid = 0;
    INSERT INTO dbo.TDynamicMenuHierarchy (DynamicMenuXML, Createdby, Createdate, employerid)
    VALUES (@UpdatedBaseXmlText, @CreatedBy, GETDATE(), 0);

    INSERT INTO dbo.tMenuDetails (MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname)
    VALUES (@NewMenuId, @MenuName, @NavigateURL, @PageName, 1, 0, @CreatedBy, GETDATE(), @IconName);

    INSERT INTO dbo.TMenuHierarchy (MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq)
    VALUES (@NewMenuId, @ParentMenuIdForTable, GETDATE(), @CreatedBy, 0, @BaseParentSeq);

    INSERT INTO dbo.TModuleMenuMapping (MenuId, ModuleID, CreatedBy, CreatedDate, IsDefault)
    VALUES (@NewMenuId, @ModuleId, @CreatedBy, GETDATE(), CASE WHEN @ModuleId IS NULL THEN 1 ELSE 0 END);

    ----------------------------------------------------------------------
    -- Stage 2: additively propagate the same MenuId to the target employer
    -- (mirrors MenuManagerDAL.copyMenuItems / copyMenuHierarchies' column
    -- shape, but only for this one new MenuId, not a full-tree replace)
    ----------------------------------------------------------------------
    INSERT INTO dbo.tMenuDetails (MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname)
    VALUES (@NewMenuId, @MenuName, @NavigateURL, @PageName, 1, @TargetEmployerId, @CreatedBy, GETDATE(), @IconName);

    INSERT INTO dbo.TMenuHierarchy (MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq)
    VALUES (@NewMenuId, @ParentMenuIdForTable, GETDATE(), @CreatedBy, @TargetEmployerId, @TargetParentSeq);

    IF @TargetXml IS NOT NULL
    BEGIN
        INSERT INTO dbo.TDynamicMenuHierarchyHistory (Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid)
        SELECT Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid
        FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId;

        DECLARE @UpdatedTargetXml XML = @TargetXml;
        SET @UpdatedTargetXml.modify('
            insert <Node Text="{sql:variable("@MenuName")}" Value="{sql:variable("@NewMenuIdStr")}" Expanded="False"/>
            as last into (//Node[@Value=sql:variable("@ParentValueForXml")])[1]
        ');
        DECLARE @UpdatedTargetXmlText VARCHAR(MAX) = '<?xml version="1.0" encoding="utf-16"?>' + CHAR(13) + CHAR(10)
            + CAST(CAST(@UpdatedTargetXml AS NVARCHAR(MAX)) AS VARCHAR(MAX));

        DELETE FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId;
        INSERT INTO dbo.TDynamicMenuHierarchy (DynamicMenuXML, Createdby, Createdate, employerid)
        VALUES (@UpdatedTargetXmlText, @CreatedBy, GETDATE(), @TargetEmployerId);
    END

COMMIT TRAN CreateMenuItemForEmployer;

------------------------------------------------------------------------------
-- 4. SUMMARY
------------------------------------------------------------------------------
PRINT '----------------------------------------------------------------------';
PRINT 'Created MenuId = ' + @NewMenuIdStr + ' (''' + @MenuName + ''') at Employerid = 0,'
    + ' and propagated it to Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';
IF @TargetXml IS NOT NULL
    PRINT 'Target employer''s TDynamicMenuHierarchy was updated -- item is now visible in Access Rights Management for that employer.';
ELSE
    PRINT 'WARNING: target employer has NO TDynamicMenuHierarchy row (pre-existing condition) -- tMenuDetails/TMenuHierarchy were still populated so the real sidebar will render this item once access is granted, but Access Rights Management will show an empty tree for this employer regardless of this script.';
PRINT 'Still requires AssignMenuAccess.sql (or the Access Rights UI, if visible there) to grant a role/user access, then a log out/back in.';
PRINT 'To remove this item from BOTH employer 0 and the target employer, run CreateMenuItemForEmployer.cleanup.sql with @MenuId = ' + @NewMenuIdStr + ' and @TargetEmployerId = ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';
PRINT '----------------------------------------------------------------------';

SELECT MenuId, MenuName, Employerid, ISActive FROM dbo.tMenuDetails WHERE MenuId = @NewMenuId ORDER BY Employerid;
SELECT MenuId, ParentMenuId, Employerid, parentseq FROM dbo.TMenuHierarchy WHERE MenuId = @NewMenuId ORDER BY Employerid;
SELECT ModuleMenuMappingID, MenuId, ModuleID, IsDefault FROM dbo.TModuleMenuMapping WHERE MenuId = @NewMenuId;
