-- =============================================================================
-- find-users-with-menu-tab-access.sql
--
-- Purpose:  Given a menu name and/or a tab name, lists every employee who
--           currently has access to it, replicating the same runtime logic
--           as diagnose-menu-tab-access.sql but starting from the menu/tab
--           side instead of the employee side. Use this to answer "who can
--           see X today" rather than "what can this one employee see".
--           See troubleshooting/menu/README.md for the underlying SP logic
--           and the confirmed tenant-wide tab-master gap (scenario 1) - it
--           applies here too: a tab can show up as "granted" below via
--           TUserTabDetails yet still be blocked for that employee if their
--           tenant has no matching TTabDetails master row.
--
-- When to use: "does anyone currently see the 'Leave' menu / 'Approval' tab,
--           and who?", or confirming a role/user grant actually took effect
--           for the intended set of people (not just the one employee you
--           happened to test with).
--
-- Inputs:   @MenuName             (optional) - LIKE filter on tMenuDetails.
--                       MenuName, e.g. '%Leave%'. Set this and/or @TabName.
--           @TabName              (optional) - LIKE filter on TTabDetails.
--                       TabName, e.g. '%Approval%'. Set this and/or @MenuName.
--           @EmployerId           (optional) - scope to one tenant. Leave
--                       NULL to scan every tenant that has a matching
--                       menu/tab - can return a lot of rows for a common name.
--           @ActiveEmployeesOnly  (optional) - 'Y' (default) restricts to
--                       TEmployee.IsActive = 'Y'; set to 'N' to include
--                       inactive/separated employees too.
--
-- Type:     Read-only (SELECT only); uses local #temp tables (dropped at
--           the end) - no permanent objects.
-- =============================================================================

DECLARE @MenuName            VARCHAR(200) = NULL;   -- <<< set this and/or @TabName, e.g. '%Leave%'
DECLARE @TabName             VARCHAR(500) = NULL;   -- <<< set this and/or @MenuName, e.g. '%Approval%'
DECLARE @EmployerId          INT          = NULL;   -- <<< optional: leave NULL to scan every tenant
DECLARE @ActiveEmployeesOnly CHAR(1)      = 'Y';     -- <<< 'Y' = active employees only, 'N' = include inactive

IF @MenuName IS NULL AND @TabName IS NULL
BEGIN
    RAISERROR('find-users-with-menu-tab-access.sql requires @MenuName and/or @TabName to be set.', 16, 1);
    RETURN;
END

IF @ActiveEmployeesOnly = '' SET @ActiveEmployeesOnly = 'Y';

-- =============================================================================
-- Menu name lookup
-- =============================================================================
IF @MenuName IS NOT NULL
BEGIN
    IF OBJECT_ID('tempdb..#Menus') IS NOT NULL DROP TABLE #Menus;
    CREATE TABLE #Menus (MenuId INT, MenuName VARCHAR(200), Employerid INT, IsActive BIT);
    INSERT INTO #Menus (MenuId, MenuName, Employerid, IsActive)
    SELECT md.MenuId, md.MenuName, md.Employerid, md.isactive
    FROM tMenuDetails md WITH (NOLOCK)
    WHERE md.MenuName LIKE @MenuName
      AND (@EmployerId IS NULL OR md.Employerid = @EmployerId);

    -- Result set 1: which menu master rows matched, per tenant - disambiguates
    -- before trusting the employee list below (same name can exist at
    -- multiple tenants with different MenuIds, or be inactive at some).
    SELECT
        'Menu master matches' AS DatasetType,
        m.MenuId, m.MenuName, m.Employerid, m.IsActive AS MasterIsActive
    FROM #Menus m
    ORDER BY m.MenuName, m.Employerid;

    -- Result set 2: employees who would actually see it, via role grant OR
    -- user-level override - same union logic as sp_GetDynamicMenuItems.sql.
    SELECT
        'Menu access - employees' AS DatasetType,
        E.EmployeeId,
        EI.EmploymentNumber,
        U.Employerid,
        U.RoleID,
        R.RoleName,
        m.MenuId,
        m.MenuName,
        CASE WHEN rp.RoleID IS NOT NULL THEN 'Y' ELSE 'N' END AS ViaRoleGrant,
        CASE WHEN up.UserID IS NOT NULL THEN 'Y' ELSE 'N' END AS ViaUserOverride,
        CASE WHEN m.IsActive = 1 AND (rp.RoleID IS NOT NULL OR up.UserID IS NOT NULL)
             THEN 'Y' ELSE 'N' END AS WouldShowInMenu
    FROM #Menus m
    INNER JOIN TUsers U WITH (NOLOCK) ON U.Employerid = m.Employerid
    INNER JOIN TUserEmployee UE WITH (NOLOCK) ON UE.UserID = U.UserID
    INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = UE.EmployeeID
    LEFT JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId
    LEFT JOIN TRoles R WITH (NOLOCK) ON R.RoleID = U.RoleID
    LEFT JOIN TRolePagesMapping rp WITH (NOLOCK)
        ON rp.RoleID = U.RoleID AND rp.PageId = m.MenuId AND rp.Employerid = m.Employerid
    LEFT JOIN TUSerPagesMapping up WITH (NOLOCK)
        ON up.UserID = U.UserID AND up.PageId = m.MenuId AND up.Employerid = m.Employerid
    WHERE (@ActiveEmployeesOnly = 'N' OR E.IsActive = 'Y')
      AND (rp.RoleID IS NOT NULL OR up.UserID IS NOT NULL)   -- only rows with SOME grant; flip to see everyone incl. WouldShowInMenu='N' if needed
    ORDER BY m.MenuName, U.Employerid, EI.EmploymentNumber;

    DROP TABLE #Menus;
END

-- =============================================================================
-- Tab name lookup
-- =============================================================================
IF @TabName IS NOT NULL
BEGIN
    IF OBJECT_ID('tempdb..#Tabs') IS NOT NULL DROP TABLE #Tabs;
    CREATE TABLE #Tabs (Tabid INT, MenuId INT, TabName VARCHAR(500), Employerid INT, IsActive CHAR(1));
    INSERT INTO #Tabs (Tabid, MenuId, TabName, Employerid, IsActive)
    SELECT tbd.Tabid, tbd.MenuId, tbd.TabName, tbd.Employerid, tbd.IsActive
    FROM TTabDetails tbd WITH (NOLOCK)
    WHERE tbd.TabName LIKE @TabName;

    -- Result set 3: which tab master rows matched. Per the confirmed
    -- tenant-wide gap, expect these almost entirely at Employerid 0/1/10 -
    -- if @EmployerId is set to something else, this being empty already
    -- tells you why (see README.md scenario 1) before you even look at
    -- result set 4.
    SELECT
        'Tab master matches' AS DatasetType,
        t.Tabid, t.MenuId, t.TabName, t.Employerid, t.IsActive AS MasterIsActive
    FROM #Tabs t
    ORDER BY t.TabName, t.Employerid;

    -- Result set 4: employees with a per-user grant for this tab (the only
    -- thing Sp_Get_UserMenuTab_Details.sql checks - RoleTabGrant is
    -- informational only, same caveat as diagnose-menu-tab-access.sql).
    -- WouldShowTab re-checks the master row at the EMPLOYEE'S OWN Employerid,
    -- which is what actually gates visibility - not the tenant the master
    -- row above happens to live at.
    SELECT
        'Tab access - employees' AS DatasetType,
        E.EmployeeId,
        EI.EmploymentNumber,
        ut.Employerid,
        U.RoleID,
        R.RoleName,
        ut.MenuId,
        ut.TabId,
        t.TabName,
        CASE WHEN rt.RoleTabid IS NOT NULL THEN 'Y' ELSE 'N' END AS RoleTabGrant_InformationalOnly,
        CASE WHEN mst.Tabid IS NOT NULL AND mst.IsActive = 'Y' THEN 'Y' ELSE 'N' END AS WouldShowTab,
        CASE
            WHEN mst.Tabid IS NULL
                THEN 'Granted, but no TTabDetails master row at this employee''s own Employerid - tenant-wide gap (see README.md scenario 1)'
            WHEN mst.IsActive <> 'Y'
                THEN 'Granted, but tab master is inactive for this tenant'
            ELSE 'OK'
        END AS LikelyCause
    FROM #Tabs t
    INNER JOIN TUserTabDetails ut WITH (NOLOCK)
        ON ut.TabId = t.Tabid AND ut.MenuId = t.MenuId
    INNER JOIN TUsers U WITH (NOLOCK) ON U.Employerid = ut.Employerid
    INNER JOIN TUserEmployee UE WITH (NOLOCK) ON UE.UserID = ut.UserId AND UE.UserID = U.UserID
    INNER JOIN TEmployee E WITH (NOLOCK) ON E.EmployeeId = UE.EmployeeID
    LEFT JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId
    LEFT JOIN TRoles R WITH (NOLOCK) ON R.RoleID = U.RoleID
    LEFT JOIN TRoleTabDetails rt WITH (NOLOCK)
        ON rt.RoleId = U.RoleID AND rt.MenuId = ut.MenuId AND rt.TabId = ut.TabId AND rt.Employerid = ut.Employerid
    LEFT JOIN TTabDetails mst WITH (NOLOCK)
        ON mst.TabId = ut.TabId AND mst.MenuId = ut.MenuId AND mst.Employerid = ut.Employerid
    WHERE (@EmployerId IS NULL OR ut.Employerid = @EmployerId)
      AND (@ActiveEmployeesOnly = 'N' OR E.IsActive = 'Y')
    ORDER BY t.TabName, ut.Employerid, EI.EmploymentNumber;

    DROP TABLE #Tabs;
END
