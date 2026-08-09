-- =============================================================================
-- diagnose-menu-tab-access.sql
--
-- Purpose:  For one employee, replicates the actual runtime logic that
--           decides which left-menu items and which tabs-within-a-page they
--           see, and flags the most likely cause when an item is missing.
--           See troubleshooting/menu/employee-missing-menu-or-tab/README.md
--           for the full scenario writeup and the SP references below.
--
-- Root cause logic (confirmed against the actual stored procedures):
--   - Left menu (sp_GetDynamicMenuItems.sql:57-122): an item shows if EITHER
--     the employee's RoleID has a row in TRolePagesMapping OR the employee's
--     UserID has a row in TUSerPagesMapping, for that MenuId (there called
--     "PageId" - it is a TMenuHierarchy.MenuID, NOT TModulePages.ModulePageId)
--     AND Employerid matches exactly across TUsers/TRolePagesMapping/
--     TMenuHierarchy/tMenuDetails AND tMenuDetails.isactive = 1.
--   - Tabs within a page (Sp_Get_UserMenuTab_Details.sql:24-38): reads ONLY
--     TUserTabDetails (per-user grant), INNER JOINed to the TTabDetails
--     master catalog on TBD.Employerid = TUD.EmployerId (exact match). There
--     is NO fallback to TRoleTabDetails at runtime - a role-fallback UNION
--     exists but is commented out in the sibling admin proc
--     Sp_GetTabUserDetails.sql:24-43. So RoleTabGrant below is informational
--     only; UserTabGrant is what actually gates visibility today.
--   - CONFIRMED on HRM-CL-Prod (2026-08-09): TTabDetails only has rows for
--     Employerid 0, 1, and 10, while 55+ other tenants have real per-user
--     grants in TUserTabDetails. Because of the exact-match INNER JOIN
--     above, every employee at every tenant outside {0, 1, 10} gets ZERO
--     tabs back from this SP, regardless of role/user grants. Result set 2
--     below checks this first, since it is usually the real root cause.
--
-- When to use: an employee reports a missing left-menu item and/or a missing
--           tab on a page that a peer with the "same" role can see.
--
-- Inputs:   @EmployeeId       (required, unless @EmploymentNumber is set) -
--                       the employee to diagnose.
--           @EmploymentNumber (optional) - set this instead of @EmployeeId if
--                       that's what you have on hand; resolved automatically.
--           @EmployerId       (optional) - defaults to the employee's own
--                       tenant. Every access-check join pins Employerid
--                       exactly, so leave NULL unless you're specifically
--                       investigating a tenant mismatch.
--           @MenuName         (optional) - filter the menu-level result set
--                       to menu names LIKE this (e.g. '%Leave%'). NULL = all.
--           @TabName          (optional) - filter the tab-level result set to
--                       tab names LIKE this. NULL = all.
--
-- Type:     Read-only (SELECT only); uses local #temp tables (dropped at
--           the end) - no permanent objects.
-- =============================================================================

DECLARE @EmployeeId       INT           = 1431;      -- <<< REQUIRED unless @EmploymentNumber is set
DECLARE @EmploymentNumber NVARCHAR(20)  = NULL;       -- <<< or set this instead, e.g. 'E0001'
DECLARE @EmployerId       INT           = NULL;       -- <<< optional: leave NULL to use the employee's own employer
DECLARE @MenuName         VARCHAR(200)  = NULL;       -- <<< optional: e.g. '%Leave%'
DECLARE @TabName          VARCHAR(500)  = NULL;       -- <<< optional: e.g. '%Approval%'

IF @EmploymentNumber IS NOT NULL
    SELECT @EmployeeId = EmployeeId
    FROM TEmployeeInfo WITH (NOLOCK)
    WHERE EmploymentNumber = @EmploymentNumber;

IF @EmployeeId IS NULL
BEGIN
    RAISERROR('diagnose-menu-tab-access.sql requires @EmployeeId or @EmploymentNumber to be set.', 16, 1);
    RETURN;
END

-- Dedup guard: TUserEmployee has no PK/unique constraint on (UserID, EmployeeID)
-- (see troubleshooting/authentication/README.md scenario 5). TOP 1 with an
-- explicit ORDER BY makes the pick deterministic; if this employee genuinely
-- has more than one UserID, that fact itself is worth investigating first.
DECLARE @Lv_UserId INT;
SELECT TOP 1 @Lv_UserId = UE.UserID
FROM TUserEmployee UE WITH (NOLOCK)
WHERE UE.EmployeeID = @EmployeeId
ORDER BY UE.UserID DESC;

DECLARE @Lv_RoleId     INT;
DECLARE @Lv_RoleName   VARCHAR(100);
DECLARE @Lv_Employerid INT;
DECLARE @Lv_IsActive   VARCHAR(1);
SELECT
    @Lv_RoleId     = U.RoleID,
    @Lv_Employerid = ISNULL(@EmployerId, U.Employerid),
    @Lv_IsActive   = U.IsActive
FROM TUsers U WITH (NOLOCK)
WHERE U.UserID = @Lv_UserId;

SELECT @Lv_RoleName = R.RoleName
FROM TRoles R WITH (NOLOCK)
WHERE R.RoleID = @Lv_RoleId;

-- ---------------------------------------------------------------------------
-- Result set 0: identity resolution - confirms UserID/RoleID/Employerid were
-- found before trusting the result sets below.
-- ---------------------------------------------------------------------------
SELECT
    'Identity' AS DatasetType,
    @EmployeeId       AS EmployeeId,
    @Lv_UserId        AS UserId,
    @Lv_IsActive      AS UserIsActive,
    @Lv_RoleId        AS RoleId,
    @Lv_RoleName      AS RoleName,
    @Lv_Employerid    AS Employerid,
    (SELECT COUNT(*) FROM TUserEmployee WITH (NOLOCK) WHERE EmployeeID = @EmployeeId) AS UserEmployeeMappingCount;

-- ---------------------------------------------------------------------------
-- Result set 1: left-menu access, replicating sp_GetDynamicMenuItems.sql's
-- role-OR-user UNION logic.
-- ---------------------------------------------------------------------------
SELECT
    'Menu access' AS DatasetType,
    md.MenuId,
    md.MenuName,
    md.Employerid,
    md.isactive AS MasterIsActive,
    CASE WHEN rp.RoleID IS NOT NULL THEN 'Y' ELSE 'N' END AS RoleGrant,
    CASE WHEN up.UserID IS NOT NULL THEN 'Y' ELSE 'N' END AS UserGrant,
    CASE WHEN md.isactive = 1 AND (rp.RoleID IS NOT NULL OR up.UserID IS NOT NULL)
         THEN 'Y' ELSE 'N' END AS WouldShowInMenu,
    CASE
        WHEN md.isactive = 0
            THEN 'Menu master inactive for this tenant - affects every role/user, not just this employee'
        WHEN rp.RoleID IS NULL AND up.UserID IS NULL
            THEN 'Neither role nor user has a PageId/MenuId grant for this menu'
        ELSE 'OK'
    END AS LikelyCause
FROM TMenuHierarchy mh WITH (NOLOCK)
INNER JOIN tMenuDetails md WITH (NOLOCK)
    ON md.MenuId = mh.MenuID AND md.Employerid = mh.Employerid
LEFT JOIN TRolePagesMapping rp WITH (NOLOCK)
    ON rp.RoleID = @Lv_RoleId AND rp.PageId = md.MenuId AND rp.Employerid = @Lv_Employerid
LEFT JOIN TUSerPagesMapping up WITH (NOLOCK)
    ON up.UserID = @Lv_UserId AND up.PageId = md.MenuId AND up.Employerid = @Lv_Employerid
WHERE mh.Employerid = @Lv_Employerid
  AND mh.MenuID > 1
  AND (@MenuName IS NULL OR md.MenuName LIKE @MenuName)
ORDER BY md.MenuName;

-- ---------------------------------------------------------------------------
-- Result set 2: tenant-wide tab master check. CONFIRMED on HRM-CL-Prod
-- (2026-08-09): TTabDetails (the tab catalog Sp_Get_UserMenuTab_Details.sql
-- inner-joins against) only has rows for Employerid 0, 1, and 10 - out of
-- 55+ tenants that actually have per-user grants in TUserTabDetails. Because
-- the SP requires TBD.Employerid = TUD.EmployerId exactly, EVERY employee at
-- EVERY tenant outside {0, 1, 10} gets zero tabs back, no matter what is
-- granted to their role or their user. If this employee's tenant shows 0
-- here, that is very likely THE root cause - a master-data/code gap, not a
-- per-employee provisioning issue - and Result set 3 below is close to moot.
-- ---------------------------------------------------------------------------
SELECT
    'Tab master tenant check' AS DatasetType,
    @Lv_Employerid AS Employerid,
    (SELECT COUNT(*) FROM TTabDetails WITH (NOLOCK) WHERE Employerid = @Lv_Employerid) AS TabMasterRowsForThisTenant,
    (SELECT COUNT(*) FROM TUserTabDetails WITH (NOLOCK) WHERE Employerid = @Lv_Employerid) AS UserTabGrantRowsForThisTenant,
    CASE
        WHEN (SELECT COUNT(*) FROM TTabDetails WITH (NOLOCK) WHERE Employerid = @Lv_Employerid) = 0
             AND (SELECT COUNT(*) FROM TUserTabDetails WITH (NOLOCK) WHERE Employerid = @Lv_Employerid) > 0
            THEN 'Tab master has ZERO rows for this tenant while per-user grants exist - Sp_Get_UserMenuTab_Details INNER JOINs on TBD.Employerid = TUD.EmployerId, so it returns no tabs for ANY employee at this tenant regardless of grants. Tenant-wide issue.'
        WHEN (SELECT COUNT(*) FROM TTabDetails WITH (NOLOCK) WHERE Employerid = @Lv_Employerid) = 0
            THEN 'Tab master has ZERO rows for this tenant, and no per-user grants exist either - tabs were likely never configured for this tenant at all.'
        ELSE 'Tab master has rows for this tenant - proceed to Result set 3 for the per-employee breakdown.'
    END AS LikelyCause;

-- ---------------------------------------------------------------------------
-- Result set 3: per-employee tab access, replicating Sp_Get_UserMenuTab_
-- Details.sql's exact join (base table is the per-user grant, not the tab
-- master, so a tenant-wide gap from Result set 2 shows here as 0 rows rather
-- than disappearing silently). RoleTabGrant is shown for context only - the
-- SP does not consult TRoleTabDetails at runtime, so UserTabGrant alone
-- drives WouldShowTab.
-- ---------------------------------------------------------------------------
SELECT
    'Tab access' AS DatasetType,
    md.MenuName,
    ut.MenuId,
    ut.TabId,
    tbd.TabName,
    ut.Employerid,
    tbd.IsActive AS MasterIsActive,
    CASE WHEN rt.RoleTabid IS NOT NULL THEN 'Y' ELSE 'N' END AS RoleTabGrant_InformationalOnly,
    'Y' AS UserTabGrant,
    CASE WHEN tbd.Tabid IS NOT NULL AND tbd.IsActive = 'Y' THEN 'Y' ELSE 'N' END AS WouldShowTab,
    CASE
        WHEN tbd.Tabid IS NULL
            THEN 'Per-user grant exists but no matching TTabDetails row at this tenant''s Employerid - see Result set 2 (tenant-wide tab master gap)'
        WHEN tbd.IsActive <> 'Y'
            THEN 'Tab master inactive for this tenant - affects every role/user, not just this employee'
        ELSE 'OK'
    END AS LikelyCause
FROM TUserTabDetails ut WITH (NOLOCK)
LEFT JOIN TTabDetails tbd WITH (NOLOCK)
    ON tbd.TabId = ut.TabId AND tbd.MenuId = ut.MenuId AND tbd.Employerid = ut.Employerid
LEFT JOIN tMenuDetails md WITH (NOLOCK)
    ON md.MenuId = ut.MenuId AND md.Employerid = ut.Employerid
LEFT JOIN TRoleTabDetails rt WITH (NOLOCK)
    ON rt.RoleId = @Lv_RoleId AND rt.MenuId = ut.MenuId AND rt.TabId = ut.TabId AND rt.Employerid = @Lv_Employerid
WHERE ut.UserId = @Lv_UserId
  AND ut.Employerid = @Lv_Employerid
  AND (@TabName IS NULL OR tbd.TabName LIKE @TabName)
ORDER BY md.MenuName, tbd.TabName;
