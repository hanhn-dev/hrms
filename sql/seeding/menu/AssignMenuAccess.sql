/* =============================================================================
   Grant an existing menu item's visibility to a Role or a specific User, for
   an existing employer in DEV.

   sp_GetDynamicMenuItems.sql (the proc SiteMain.Master.cs's buildHrmsMenu
   calls to build the sidebar) only ever returns a MenuId to a logged-in user
   if EITHER:
     - their Role has a TRolePagesMapping row for it (RoleID + PageId, PageId
       being the MenuId), scoped to their Employerid, OR
     - they personally have a TUSerPagesMapping row for it (UserID + PageId),
       independent of role.
   This script adds exactly one of those two rows. TRolePagesMapping.LocationIds/
   BusinessUnitIds and the tab-access tables (TRoleTabDetails/TTabDetails) are
   NOT touched -- confirmed sp_GetDynamicMenuItems does not reference them when
   deciding whether the top-level menu item is visible, so they are out of
   scope for "can see it in the sidebar" (they matter for other, unrelated
   data-scoping/in-page-tab features).

   For the Role branch, reuses dbo.Sp_InsRolePagesMapping -- the app's own
   additive, idempotent proc (checks for an existing (RoleID, PageId,
   Employerid) row before inserting, and appends to TRolePagesMappingHistory).
   This is deliberately NOT SP_InsertRolePageMapping, which REPLACES the
   role's entire page list -- using that here would wipe out every other page
   the role currently has access to.

   For the User branch, no equivalent single-row proc exists in this repo, so
   this script hand-rolls the same additive/idempotent shape directly against
   TUSerPagesMapping (+ TUSerPagesMappingHistory).

   Even after this runs, an already-logged-in target user will not see the
   item: SiteMain.Master.cs caches the rendered sidebar HTML in
   Session["HRMS_MENU"] for the life of the login session, with no
   invalidation hook anywhere in HRMS.Web. They must log out and back in.

   To remove what this script grants, see ./AssignMenuAccess.cleanup.sql.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION -- edit these, then run the whole script
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT = 0;     -- <<< existing Employerid in DEV
DECLARE @MenuId           INT = 0;     -- <<< an existing MenuId for this employer (e.g. printed by CreateMenuItem.sql)
DECLARE @CreatedBy        INT = 1;     -- <<< an EmployeeId/UserId to attribute as creator (audit column only)

-- Set EXACTLY ONE of the two grant targets below, leave the other NULL:
DECLARE @RoleId INT = NULL;   -- <<< grant to everyone holding this RoleID (TRoles.RoleID)
DECLARE @UserId INT = NULL;   -- <<< grant to this one user only (TUsers.UserID -- NOT EmployeeId)

------------------------------------------------------------------------------
-- 2. VALIDATION
------------------------------------------------------------------------------
IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId before running this script.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TargetEmployerId)
    THROW 50000, 'TargetEmployerId does not exist in TEmployerDetails.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId AND Employerid = @TargetEmployerId AND ISActive = 1)
    THROW 50000, '@MenuId does not exist (or is inactive) for this employer in tMenuDetails -- run CreateMenuItem.sql first, or check the MenuId.', 1;

IF (@RoleId IS NULL AND @UserId IS NULL) OR (@RoleId IS NOT NULL AND @UserId IS NOT NULL)
    THROW 50000, 'Set exactly one of @RoleId or @UserId (not both, not neither).', 1;

IF @RoleId IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM dbo.TRoles WHERE RoleID = @RoleId AND (Employerid = @TargetEmployerId OR IsGlobalAccess = 'Y') AND IsActive = 'Y')
    THROW 50000, '@RoleId not found as an active role for this employer (or global).', 1;

IF @UserId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.TUsers WHERE UserID = @UserId AND Employerid = @TargetEmployerId)
    THROW 50000, '@UserId not found for this employer in TUsers (TUsers.UserID, not EmployeeId).', 1;

------------------------------------------------------------------------------
-- 3. GRANT
------------------------------------------------------------------------------
IF @RoleId IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.TRolePagesMapping WHERE RoleID = @RoleId AND PageId = @MenuId AND Employerid = @TargetEmployerId)
        PRINT 'RoleID ' + CAST(@RoleId AS VARCHAR(10)) + ' already has access to MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' -- no change.';
    ELSE
    BEGIN
        EXEC dbo.Sp_InsRolePagesMapping
            @RoleId     = @RoleId,
            @PageId     = @MenuId,
            @EmployerId = @TargetEmployerId,
            @CreatedBy  = @CreatedBy;

        PRINT 'Granted MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' to RoleID ' + CAST(@RoleId AS VARCHAR(10))
            + ' for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';
        PRINT 'Every user with this RoleID (in this employer) will see the item after they next log in.';
    END
END
ELSE
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.TUSerPagesMapping WHERE UserID = @UserId AND PageId = @MenuId AND Employerid = @TargetEmployerId)
        PRINT 'UserID ' + CAST(@UserId AS VARCHAR(10)) + ' already has access to MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' -- no change.';
    ELSE
    BEGIN
        DECLARE @UserRoleId INT = (SELECT RoleID FROM dbo.TUsers WHERE UserID = @UserId);
        DECLARE @lv_TransId INT = (SELECT ISNULL(MAX(transid), 0) + 1 FROM dbo.TUSerPagesMappingHistory WHERE Employerid = @TargetEmployerId);

        BEGIN TRAN GrantUserMenuAccess;

            INSERT INTO dbo.TUSerPagesMapping (UserID, PageId, CreatedBy, CreationDate, Employerid, CreationDateUtcTime, roleid)
            VALUES (@UserId, @MenuId, @CreatedBy, GETDATE(), @TargetEmployerId, GETUTCDATE(), @UserRoleId);

            INSERT INTO dbo.TUSerPagesMappingHistory (UserID, PageId, ModifiedBy, Modifiedon, transid, Employerid, ModifiedUtcTime, roleid)
            VALUES (@UserId, @MenuId, @CreatedBy, GETDATE(), @lv_TransId, @TargetEmployerId, GETUTCDATE(), @UserRoleId);

        COMMIT TRAN GrantUserMenuAccess;

        PRINT 'Granted MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' to UserID ' + CAST(@UserId AS VARCHAR(10))
            + ' for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';
        PRINT 'This one user will see the item after they next log in.';
    END
END

------------------------------------------------------------------------------
-- 4. SUMMARY
------------------------------------------------------------------------------
SELECT RoleID, PageId, Employerid, CreationDate FROM dbo.TRolePagesMapping WHERE PageId = @MenuId AND Employerid = @TargetEmployerId;
SELECT UserID, PageId, Employerid, CreationDate FROM dbo.TUSerPagesMapping WHERE PageId = @MenuId AND Employerid = @TargetEmployerId;
