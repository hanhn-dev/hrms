/* =============================================================================
   Create a new left-nav menu item for an EXISTING employer in DEV.

   Writes the same two tables the sidebar renderer actually reads
   (confirmed against SiteMain.Master.cs -> DashboardBLL.GetMenuItems ->
   sp_GetDynamicMenuItems.sql):
     - dbo.tMenuDetails   -- the item itself (name, URL, page, icon)
     - dbo.TMenuHierarchy -- its parent/position in the tree
   and, for shape-parity with the real MenuManager_React -> HRMS.CoreAPI
   flow (MenuManagerDAL.insertMenuItem / createModuleMenuMapping), also adds
   a dbo.TModuleMenuMapping row. That table is NOT consulted by
   sp_GetDynamicMenuItems at render time -- it only matters if this employer's
   config later gets propagated to other employers via the real admin tool --
   so its absence would not stop the item from appearing here.

   MenuId is a plain INT column with no identity/PK (confirmed: no constraints
   in TABLES/tMenuDetails.sql / TMenuHierarchy.sql), but it is treated as
   globally unique across ALL employers in production data (the same MenuId
   denotes "the same logical page" when cloned across tenants). This script
   follows suit: new MenuId = MAX(MenuId)+1 across the WHOLE tMenuDetails
   table (matching MenuManagerDAL.getMaxMenuId in the Node CoreAPI), not just
   this employer -- so it never collides with another tenant's existing item.

   NOT done here (out of scope for "create the item"; see AssignMenuAccess.sql):
     - No TRolePagesMapping / TUSerPagesMapping row -- until one exists for a
       role/user, sp_GetDynamicMenuItems will never return this MenuId to
       them, so the item is created but invisible to everyone.
     - dbo.TDynamicMenuHierarchy (the XML tree snapshot) is left untouched.
       It is only read by the legacy tree-view editor UI
       (RoleManagement.aspx's "Dynamic Menu Creation" tab) and MenuManager_React's
       initial load -- opening those screens for this employer afterward will
       show a stale tree missing this item, but that does not affect the
       rendered sidebar.

   Even after running AssignMenuAccess.sql, an already-logged-in user will not
   see the item: SiteMain.Master.cs caches the rendered sidebar HTML in
   Session["HRMS_MENU"] for the life of the login session, with no
   invalidation hook anywhere in HRMS.Web. The target user must log out and
   back in.

   To remove what this script creates, see ./CreateMenuItem.cleanup.sql.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these, then run the whole script
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT           = 0;         -- <<< existing Employerid in DEV
DECLARE @MenuName         VARCHAR(200)  = 'TEST Menu Item';  -- <<< label shown in the sidebar
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

IF @ParentMenuId <> 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = @TargetEmployerId AND mh.MenuId = @ParentMenuId
)
    THROW 50000, '@ParentMenuId does not exist for this employer -- check TMenuHierarchy/tMenuDetails, or use 0 for a top-level item.', 1;

IF @ModuleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.THrmsModules WHERE ModuleId = @ModuleId)
    THROW 50000, '@ModuleId does not exist in THrmsModules.', 1;

IF EXISTS (
    SELECT 1 FROM dbo.TMenuHierarchy mh
    JOIN dbo.tMenuDetails md ON md.MenuId = mh.MenuId AND md.Employerid = mh.Employerid
    WHERE mh.Employerid = @TargetEmployerId
      AND mh.ParentMenuId = @ParentMenuId
      AND md.MenuName = @MenuName
      AND md.ISActive = 1
)
    THROW 50000, 'A menu item with this @MenuName already exists under the same @ParentMenuId for this employer (AddMenu.jsx blocks this same duplicate-sibling case in the real admin tool).', 1;

------------------------------------------------------------------------------
-- 3. CREATE
------------------------------------------------------------------------------
DECLARE @NewMenuId INT = (SELECT ISNULL(MAX(MenuId), 0) + 1 FROM dbo.tMenuDetails);
DECLARE @ParentSeq INT = (
    SELECT ISNULL(MAX(parentseq), 0) + 1
    FROM dbo.TMenuHierarchy
    WHERE Employerid = @TargetEmployerId AND ParentMenuId = @ParentMenuId
);

BEGIN TRAN CreateMenuItem;

    INSERT INTO dbo.tMenuDetails (MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname)
    VALUES (@NewMenuId, @MenuName, @NavigateURL, @PageName, 1, @TargetEmployerId, @CreatedBy, GETDATE(), @IconName);

    INSERT INTO dbo.TMenuHierarchy (MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq)
    VALUES (@NewMenuId, @ParentMenuId, GETDATE(), @CreatedBy, @TargetEmployerId, @ParentSeq);

    INSERT INTO dbo.TModuleMenuMapping (MenuId, ModuleID, CreatedBy, CreatedDate, IsDefault)
    VALUES (@NewMenuId, @ModuleId, @CreatedBy, GETDATE(), CASE WHEN @ModuleId IS NULL THEN 1 ELSE 0 END);

COMMIT TRAN CreateMenuItem;

------------------------------------------------------------------------------
-- 4. SUMMARY
------------------------------------------------------------------------------
PRINT '----------------------------------------------------------------------';
PRINT 'Created MenuId = ' + CAST(@NewMenuId AS VARCHAR(10)) + ' (''' + @MenuName + ''')'
    + ' for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10))
    + ', ParentMenuId = ' + CAST(@ParentMenuId AS VARCHAR(10)) + '.';
PRINT 'It will NOT appear in anyone''s sidebar yet -- run AssignMenuAccess.sql with @MenuId = '
    + CAST(@NewMenuId AS VARCHAR(10)) + ' for the target role or user, then have them log out/back in.';
PRINT 'To remove this item, run CreateMenuItem.cleanup.sql with @TargetEmployerId = '
    + CAST(@TargetEmployerId AS VARCHAR(10)) + ' and @MenuId = ' + CAST(@NewMenuId AS VARCHAR(10)) + '.';
PRINT '----------------------------------------------------------------------';

SELECT MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, iconname FROM dbo.tMenuDetails WHERE MenuId = @NewMenuId AND Employerid = @TargetEmployerId;
SELECT MenuId, ParentMenuId, Employerid, parentseq FROM dbo.TMenuHierarchy WHERE MenuId = @NewMenuId AND Employerid = @TargetEmployerId;
SELECT ModuleMenuMappingID, MenuId, ModuleID, IsDefault FROM dbo.TModuleMenuMapping WHERE MenuId = @NewMenuId;
