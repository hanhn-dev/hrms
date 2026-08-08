/* =============================================================================
   Create a new left-nav menu item for an EXISTING employer in DEV -- same
   effect as ./CreateMenuItem.sql (inserts into tMenuDetails + TMenuHierarchy
   + TModuleMenuMapping), PLUS keeps that employer's dbo.TDynamicMenuHierarchy
   XML snapshot in sync.

   Why this variant exists: ./CreateMenuItem.sql never touches
   TDynamicMenuHierarchy, so the new item is invisible in the Access Rights
   Management page. Confirmed against RoleManagement.aspx.cs:2261
   (createMenuRoleUserTreeView): BOTH the role checkbox tree
   (ModulePagesTreeView) AND the per-user permission tree
   (RadTreeViewUserPermission) load via RoleManagementDAL.GetDynamicMenuXml
   -> sp_GetDynamicMenuHierarchy -> TDynamicMenuHierarchy.DynamicMenuXML for
   that employer -- NOT from tMenuDetails/TMenuHierarchy directly. Without
   this sync, an admin opening that screen has nothing to check to grant the
   item (you'd still have to hand-write the TRolePagesMapping/TUSerPagesMapping
   row via AssignMenuAccess.sql, same as with the plain version). With this
   sync, the item shows up there too and can be granted through that UI if
   preferred.

   XML schema (confirmed against a live sample of TDynamicMenuHierarchy, and
   against MenuManagerBLL.js's _convertMenuTreeToXML, which produces the
   identical shape):
     <?xml version="1.0" encoding="utf-16"?>
     <Tree ...><Node Text="DynamicMenu" Value="1" Expanded="True">
       <Node Text="Home-97" Value="2" Expanded="False">
         <Node Text="..." Value="..." Expanded="False" />
       </Node>
     </Tree>
   MenuId 1 ("DynamicMenu") is a permanent placeholder root every top-level
   item nests under (it's excluded from rendering elsewhere via the
   `MenuID > 1` filter in sp_GetDynamicMenuItems). @ParentMenuId = 0 in this
   script's config means "top level", which maps to XML parent Value="1" and
   TMenuHierarchy.ParentMenuId = NULL (confirmed against live data for
   Employerid=0, MenuId 1/2/3 -- NOT literal 0; DashboardBLL.cs:34 coalesces
   NULL to 0 when reading, so either value renders correctly, but NULL
   matches what real rows actually contain).

   IMPORTANT gotcha (found by testing against a live sample, not assumed):
   CAST(DynamicMenuXML AS XML) FAILS with "XML parsing: unable to switch the
   encoding" because the stored prolog says encoding="utf-16" while the
   column is VARCHAR. .NET's RadTreeView.LoadXml() tolerates this (it parses
   an in-memory string, not a byte stream) but T-SQL's native XML parser does
   not -- must CAST through NVARCHAR(MAX) first, as done below.

   This script does a SURGICAL single-node insert via XQuery .modify(), NOT
   the full delete-and-rebuild-from-scratch that the app's own
   sp_InsertDynamicMenuHierarchy performs when an admin saves from the
   legacy tree-editor UI (that proc wipes and reconstructs ALL of
   tMenuDetails/TMenuHierarchy/TDynamicMenuHierarchy for the employer from a
   pipe-delimited hierarchy string). A surgical insert is safer to run
   repeatedly against a shared dev employer; it is not what production code
   actually executes.

   The current TDynamicMenuHierarchy row for this employer is archived into
   TDynamicMenuHierarchyHistory before being replaced, matching
   sp_InsertDynamicMenuHierarchy's own behavior (its HistoryCreatedBy /
   HistoryCreatedDate / ActionType columns are left NULL here too, matching
   what that proc itself does -- it never sets them either).

   NOTE: TDynamicMenuHierarchy.DynamicMenuXML is VARCHAR(MAX), not NVARCHAR
   (MAX) -- a @MenuName containing non-Latin-1 characters would be silently
   lossy on save, same limitation the production column already has today;
   this script does not attempt to fix that pre-existing schema constraint.

   Even after this runs, an already-logged-in user will not see the item in
   the sidebar, and an admin with the Access Rights Management screen already
   open won't see it either without reloading: SiteMain.Master.cs caches the
   sidebar in Session["HRMS_MENU"], and this screen loads its tree once per
   page visit. Still requires AssignMenuAccess.sql (or the Access Rights UI,
   now that the item is visible there) to actually grant it to a role/user.

   To remove what this script creates, see ./CreateMenuItem.XmlSync.cleanup.sql.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these, then run the whole script
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT           = 0;         -- <<< existing Employerid in DEV
DECLARE @MenuName         VARCHAR(200)  = 'TEST Menu Item';  -- <<< label shown in the sidebar / Access Rights tree
DECLARE @NavigateURL      VARCHAR(1000) = '';         -- <<< e.g. 'HRM/Settings/SomePage.aspx'
DECLARE @PageName         VARCHAR(200)  = '';         -- <<< e.g. 'SomePage.aspx'
DECLARE @IconName         VARCHAR(200)  = '';         -- <<< CSS icon class, see getLogoClass() in SiteMain.Master.cs; blank is fine for a test
DECLARE @ParentMenuId     INT           = 0;          -- <<< 0 = top-level item; otherwise an existing MenuId for this employer
DECLARE @ModuleId         INT           = NULL;       -- <<< NULL = "general" item (IsDefault=1); or an existing THrmsModules.ModuleId
DECLARE @CreatedBy        INT           = 1;           -- <<< an EmployeeId/UserId to attribute as creator (audit column only)

------------------------------------------------------------------------------
-- 2. VALIDATION
------------------------------------------------------------------------------
IF @TargetEmployerId < 0
    THROW 50000, 'Set @TargetEmployerId to a real Employerid before running this script.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TargetEmployerId)
    THROW 50000, 'TargetEmployerId does not exist in TEmployerDetails.', 1;
IF ISNULL(LTRIM(RTRIM(@MenuName)), '') = ''
    THROW 50000, '@MenuName is required.', 1;
IF @ModuleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.THrmsModules WHERE ModuleId = @ModuleId)
    THROW 50000, '@ModuleId does not exist in THrmsModules.', 1;

DECLARE @ParentMenuIdForTable INT = CASE WHEN @ParentMenuId = 0 THEN NULL ELSE @ParentMenuId END;
DECLARE @ParentValueForXml    VARCHAR(20) = CASE WHEN @ParentMenuId = 0 THEN '1' ELSE CAST(@ParentMenuId AS VARCHAR(20)) END;

IF @ParentMenuId <> 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = @TargetEmployerId AND mh.MenuId = @ParentMenuId
)
    THROW 50000, '@ParentMenuId does not exist for this employer in tMenuDetails/TMenuHierarchy -- check the MenuId, or use 0 for a top-level item.', 1;

IF EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = @TargetEmployerId
      AND ((mh.ParentMenuId IS NULL AND @ParentMenuIdForTable IS NULL) OR mh.ParentMenuId = @ParentMenuIdForTable)
      AND md.MenuName = @MenuName
      AND md.ISActive = 1
)
    THROW 50000, 'A menu item with this @MenuName already exists under the same @ParentMenuId for this employer (tMenuDetails/TMenuHierarchy).', 1;

DECLARE @CurrentXmlVarchar VARCHAR(MAX) = (
    SELECT TOP (1) DynamicMenuXML FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId ORDER BY Transid DESC
);
IF @CurrentXmlVarchar IS NULL
    THROW 50000, 'No TDynamicMenuHierarchy row exists yet for this employer -- this variant only SYNCS an existing tree, it does not create one from scratch. Use the legacy RoleManagement.aspx "Dynamic Menu Creation" tab (or seed one) first, or use the plain ./CreateMenuItem.sql instead.', 1;

DECLARE @CurrentXml XML = CAST(CAST(@CurrentXmlVarchar AS NVARCHAR(MAX)) AS XML);  -- NVARCHAR hop avoids "unable to switch the encoding" -- see header comment

IF @CurrentXml.exist('(//Node[@Value=sql:variable("@ParentValueForXml")])[1]') = 0
    THROW 50000, '@ParentMenuId (or the top-level root, Value="1") was not found in this employer''s current TDynamicMenuHierarchy XML -- the XML and the tables have drifted apart for this employer. Investigate before using this script.', 1;

IF @CurrentXml.exist('(//Node[@Value=sql:variable("@ParentValueForXml")]/Node[@Text=sql:variable("@MenuName")])[1]') = 1
    THROW 50000, 'A sibling node with this @MenuName already exists under this parent in the current XML (AddMenu.jsx blocks this same duplicate-sibling case in the real admin tool).', 1;

------------------------------------------------------------------------------
-- 3. CREATE
------------------------------------------------------------------------------
DECLARE @NewMenuId INT = (SELECT ISNULL(MAX(MenuId), 0) + 1 FROM dbo.tMenuDetails);
DECLARE @NewMenuIdStr VARCHAR(20) = CAST(@NewMenuId AS VARCHAR(20));
DECLARE @ParentSeq INT = (
    SELECT ISNULL(MAX(parentseq), 0) + 1
    FROM dbo.TMenuHierarchy
    WHERE Employerid = @TargetEmployerId
      AND ((ParentMenuId IS NULL AND @ParentMenuIdForTable IS NULL) OR ParentMenuId = @ParentMenuIdForTable)
);

BEGIN TRAN CreateMenuItemXmlSync;

    -- 3a. Archive + replace the XML snapshot (mirrors sp_InsertDynamicMenuHierarchy's own history step)
    INSERT INTO dbo.TDynamicMenuHierarchyHistory (Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid)
    SELECT Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid
    FROM dbo.TDynamicMenuHierarchy
    WHERE employerid = @TargetEmployerId;

    DECLARE @UpdatedXml XML = @CurrentXml;
    SET @UpdatedXml.modify('
        insert <Node Text="{sql:variable("@MenuName")}" Value="{sql:variable("@NewMenuIdStr")}" Expanded="False"/>
        as last into (//Node[@Value=sql:variable("@ParentValueForXml")])[1]
    ');

    -- CAST(xml AS nvarchar) drops the <?xml ...?> prolog -- re-prepend it to match every existing row's format
    DECLARE @UpdatedXmlText VARCHAR(MAX) = '<?xml version="1.0" encoding="utf-16"?>' + CHAR(13) + CHAR(10)
        + CAST(CAST(@UpdatedXml AS NVARCHAR(MAX)) AS VARCHAR(MAX));

    DELETE FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId;

    INSERT INTO dbo.TDynamicMenuHierarchy (DynamicMenuXML, Createdby, Createdate, employerid)
    VALUES (@UpdatedXmlText, @CreatedBy, GETDATE(), @TargetEmployerId);

    -- 3b. Same table writes as the plain CreateMenuItem.sql
    INSERT INTO dbo.tMenuDetails (MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname)
    VALUES (@NewMenuId, @MenuName, @NavigateURL, @PageName, 1, @TargetEmployerId, @CreatedBy, GETDATE(), @IconName);

    INSERT INTO dbo.TMenuHierarchy (MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq)
    VALUES (@NewMenuId, @ParentMenuIdForTable, GETDATE(), @CreatedBy, @TargetEmployerId, @ParentSeq);

    INSERT INTO dbo.TModuleMenuMapping (MenuId, ModuleID, CreatedBy, CreatedDate, IsDefault)
    VALUES (@NewMenuId, @ModuleId, @CreatedBy, GETDATE(), CASE WHEN @ModuleId IS NULL THEN 1 ELSE 0 END);

COMMIT TRAN CreateMenuItemXmlSync;

------------------------------------------------------------------------------
-- 4. SUMMARY -- verify the XML round-tripped correctly, don't just assume it
------------------------------------------------------------------------------
PRINT '----------------------------------------------------------------------';
PRINT 'Created MenuId = ' + @NewMenuIdStr + ' (''' + @MenuName + ''')'
    + ' for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10))
    + ', ParentMenuId = ' + CAST(@ParentMenuId AS VARCHAR(10)) + '.';
PRINT 'TDynamicMenuHierarchy is now in sync -- the item will appear in the Access Rights Management page''s trees for this employer.';
PRINT 'Still not visible in anyone''s sidebar until a role/user is granted access -- run AssignMenuAccess.sql, or use the Access Rights Management UI now that the item is checkable there, then have them log out/back in.';
PRINT 'To remove this item, run CreateMenuItem.XmlSync.cleanup.sql with @TargetEmployerId = '
    + CAST(@TargetEmployerId AS VARCHAR(10)) + ' and @MenuId = ' + @NewMenuIdStr + '.';
PRINT '----------------------------------------------------------------------';

SELECT MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, iconname FROM dbo.tMenuDetails WHERE MenuId = @NewMenuId AND Employerid = @TargetEmployerId;
SELECT MenuId, ParentMenuId, Employerid, parentseq FROM dbo.TMenuHierarchy WHERE MenuId = @NewMenuId AND Employerid = @TargetEmployerId;
SELECT ModuleMenuMappingID, MenuId, ModuleID, IsDefault FROM dbo.TModuleMenuMapping WHERE MenuId = @NewMenuId;

-- Round-trip check: re-read the stored XML back from the table and pull out just the new node,
-- so you can see with your own eyes it saved correctly rather than trusting the .modify() call blindly.
SELECT CAST(
    CAST(CAST((SELECT TOP (1) DynamicMenuXML FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId ORDER BY Transid DESC) AS NVARCHAR(MAX)) AS XML)
        .query('(//Node[@Value=sql:variable("@NewMenuIdStr")])[1]')
    AS NVARCHAR(1000)
) AS NewNodeInStoredXml;
