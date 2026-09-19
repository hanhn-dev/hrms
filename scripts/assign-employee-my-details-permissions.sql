-- =============================================================================
-- assign-employee-my-details-permissions.sql
--
-- Purpose:  Grant an employee My Details access so Role Management Access
--           Rights and/or My Details Setup Permissions look correct.
--
-- What it writes (controlled by flags below):
--   1) TUSerPagesMapping     — left-menu page grant for My Details (MenuId=5)
--   2) TUserTabDetails       — Access Rights tabs under My Details (View /
--                              View & Edit). Runtime tab SP reads THIS table.
--   3) TEmployeeRoleUserTabDetails — My Details Setup Permissions (section /
--                              tab visibility on the React My Details page)
--
-- When to use: DEV/QA when an employee cannot see My Details sections or
--           Access Rights only shows the stray "past experience" leaf and you
--           still need the employee’s tab / section grants populated.
--
-- Note: If Access Rights still shows only "past experience" under My Details
--       for EVERY role, that is a Dynamic Menu XML issue (menu 1314 nested
--       under MenuId=5). Fix TDynamicMenuHierarchy separately; this script
--       does not rewrite DynamicMenuXML.
--
-- Type:     WRITE — wraps DML in one transaction. Review the preview SELECTs,
--           then flip @CommitChanges to 1.
--
-- Inputs:   set the variables in the block marked <<< EDIT THESE >>>
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

------------------------------------------------------------------------------
-- <<< EDIT THESE >>>
------------------------------------------------------------------------------
DECLARE @EmployeeId         INT          = NULL;   -- e.g. 1431
DECLARE @EmploymentNumber   NVARCHAR(50) = NULL;   -- or e.g. 'E0001' (used if @EmployeeId is NULL)
DECLARE @IsEditable         CHAR(1)      = 'Y';    -- 'Y' = View & Edit, 'N' = View only
DECLARE @CreatedBy          INT          = 1;      -- audit user

-- What to grant
DECLARE @GrantAccessRightsPage   BIT = 1;  -- TUSerPagesMapping (My Details page)
DECLARE @GrantAccessRightsTabs   BIT = 1;  -- TUserTabDetails (MenuId = 5 tabs)
DECLARE @GrantMyDetailsSetup     BIT = 1;  -- TEmployeeRoleUserTabDetails (sections)

-- Safety: leave 0 to preview + ROLLBACK; set 1 to COMMIT
DECLARE @CommitChanges      BIT = 0;
------------------------------------------------------------------------------

DECLARE @MyDetailsMenuId INT = 5;

------------------------------------------------------------------------------
-- Resolve employee / user / employer / role
------------------------------------------------------------------------------
IF @EmployeeId IS NULL AND @EmploymentNumber IS NOT NULL
BEGIN
    SELECT @EmployeeId = EI.EmployeeId
    FROM dbo.TEmployeeInfo EI WITH (NOLOCK)
    WHERE EI.EmploymentNumber = @EmploymentNumber;
END

IF @EmployeeId IS NULL
BEGIN
    RAISERROR('Set @EmployeeId or @EmploymentNumber before running.', 16, 1);
    RETURN;
END

IF @IsEditable NOT IN ('Y', 'N')
BEGIN
    RAISERROR('@IsEditable must be ''Y'' or ''N''.', 16, 1);
    RETURN;
END

DECLARE @UserId     INT;
DECLARE @EmployerId INT;
DECLARE @RoleId     INT;
DECLARE @EmpName    NVARCHAR(200);
DECLARE @EmpNo      NVARCHAR(50);

SELECT TOP 1
    @UserId     = UE.UserID,
    @EmployerId = U.Employerid,
    @RoleId     = U.RoleID,
    @EmpName    = EI.EmployeeName,
    @EmpNo      = EI.EmploymentNumber
FROM dbo.TUserEmployee UE WITH (NOLOCK)
INNER JOIN dbo.TUsers U WITH (NOLOCK)
    ON U.UserID = UE.UserID
INNER JOIN dbo.TEmployeeInfo EI WITH (NOLOCK)
    ON EI.EmployeeId = UE.EmployeeID
WHERE UE.EmployeeID = @EmployeeId
ORDER BY UE.UserID DESC;

IF @UserId IS NULL OR @EmployerId IS NULL
BEGIN
    RAISERROR('Could not resolve UserId/EmployerId for that employee (check TUserEmployee / TUsers).', 16, 1);
    RETURN;
END

PRINT '--- Target ---';
PRINT 'EmployeeId=' + CAST(@EmployeeId AS VARCHAR(20))
    + ' EmploymentNumber=' + ISNULL(@EmpNo, '')
    + ' Name=' + ISNULL(@EmpName, '');
PRINT 'UserId=' + CAST(@UserId AS VARCHAR(20))
    + ' EmployerId=' + CAST(@EmployerId AS VARCHAR(20))
    + ' RoleId=' + ISNULL(CAST(@RoleId AS VARCHAR(20)), 'NULL')
    + ' IsEditable=' + @IsEditable;
PRINT 'CommitChanges=' + CAST(@CommitChanges AS VARCHAR(1));

------------------------------------------------------------------------------
-- Preview: current grants
------------------------------------------------------------------------------
PRINT '--- Current TUSerPagesMapping (My Details) ---';
SELECT *
FROM dbo.TUSerPagesMapping WITH (NOLOCK)
WHERE UserID = @UserId
  AND Employerid = @EmployerId
  AND PageId = @MyDetailsMenuId;

PRINT '--- Current TUserTabDetails (MenuId=5) ---';
SELECT utd.*, td.TabName
FROM dbo.TUserTabDetails utd WITH (NOLOCK)
LEFT JOIN dbo.TTabDetails td WITH (NOLOCK)
    ON td.Tabid = utd.TabId
   AND td.MenuId = utd.MenuId
   AND (td.Employerid = utd.Employerid OR td.Employerid = 0)
WHERE utd.UserId = @UserId
  AND utd.Employerid = @EmployerId
  AND utd.MenuId = @MyDetailsMenuId
ORDER BY td.TabName;

PRINT '--- Current TEmployeeRoleUserTabDetails (employee overrides) ---';
SELECT er.*, ms.ModuleSectionName, mt.ModuleTabName
FROM dbo.TEmployeeRoleUserTabDetails er WITH (NOLOCK)
LEFT JOIN dbo.TEmployeeModuleSections ms WITH (NOLOCK)
    ON ms.ModuleSectionId = er.ModuleSectionId
LEFT JOIN dbo.TEmployeeModuleTabs mt WITH (NOLOCK)
    ON mt.ModuleTabId = er.ModuleTabId
WHERE er.EmployeeId = @EmployeeId
  AND er.Employerid = @EmployerId
ORDER BY er.ModuleSectionId, er.ModuleTabId;

------------------------------------------------------------------------------
-- Build target tab / section lists
------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#TargetTabs') IS NOT NULL DROP TABLE #TargetTabs;
-- One row per TabId; prefer tenant-specific TTabDetails over Employerid=0 catalog
SELECT
    x.MenuId,
    x.TabId,
    x.TabName
INTO #TargetTabs
FROM (
    SELECT
        td.MenuId,
        td.Tabid AS TabId,
        td.TabName,
        ROW_NUMBER() OVER (
            PARTITION BY td.Tabid
            ORDER BY CASE WHEN td.Employerid = @EmployerId THEN 0 ELSE 1 END,
                     td.Employerid
        ) AS rn
    FROM dbo.TTabDetails td WITH (NOLOCK)
    WHERE td.MenuId = @MyDetailsMenuId
      AND td.IsActive = 'Y'
      AND (td.Employerid = 0 OR td.Employerid = @EmployerId)
) x
WHERE x.rn = 1;

IF OBJECT_ID('tempdb..#TargetSections') IS NOT NULL DROP TABLE #TargetSections;
SELECT
    sm.ModuleSectionId,
    ISNULL(mt.ModuleTabId, 0) AS ModuleTabId,
    sm.ModuleSectionName,
    mt.ModuleTabName,
    CASE
        WHEN mt.ModuleTabId IS NULL THEN 'N'                          -- section-only: View
        WHEN ISNULL(mt.IsModuleTabEdit, 'N') = 'Y' THEN @IsEditable   -- editable tabs follow flag
        ELSE 'N'                                                     -- non-editable tabs: View only
    END AS IsEditable
INTO #TargetSections
FROM dbo.TEmployeeModuleSections sm WITH (NOLOCK)
FULL JOIN dbo.TEmployeeModuleTabs mt WITH (NOLOCK)
    ON mt.ModuleSectionId = sm.ModuleSectionId
WHERE sm.ModuleSectionId IS NOT NULL;

PRINT '--- Will grant Access Rights tabs ---';
SELECT * FROM #TargetTabs ORDER BY TabName;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TTabDetails WITH (NOLOCK)
    WHERE MenuId = @MyDetailsMenuId
      AND IsActive = 'Y'
      AND Employerid = @EmployerId
)
BEGIN
    PRINT 'WARNING: TTabDetails has no MenuId=5 rows for Employerid='
        + CAST(@EmployerId AS VARCHAR(20))
        + '. Sp_Get_UserMenuTab_Details requires TBD.Employerid = TUD.EmployerId, '
        + 'so runtime tab visibility may still be empty for this tenant '
        + '(known catalog gap; see sql/troubleshooting/menu/employee-missing-menu-or-tab/). '
        + 'Grants are still written with Employerid='
        + CAST(@EmployerId AS VARCHAR(20))
        + ' to match Role Management / Sp_InsTabUserDetails.';
END

PRINT '--- Will grant My Details Setup sections ---';
SELECT * FROM #TargetSections ORDER BY ModuleSectionId, ModuleTabId;

------------------------------------------------------------------------------
-- Apply
------------------------------------------------------------------------------
BEGIN TRY
    BEGIN TRANSACTION;

    ------------------------------------------------------------------------
    -- 1) Access Rights: My Details page
    ------------------------------------------------------------------------
    IF @GrantAccessRightsPage = 1
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.TUSerPagesMapping WITH (UPDLOCK, HOLDLOCK)
            WHERE UserID = @UserId
              AND Employerid = @EmployerId
              AND PageId = @MyDetailsMenuId
        )
        BEGIN
            INSERT INTO dbo.TUSerPagesMapping (
                UserID,
                PageId,
                CreatedBy,
                CreationDate,
                Employerid,
                CreationDateUtcTime,
                roleid
            )
            VALUES (
                @UserId,
                @MyDetailsMenuId,
                @CreatedBy,
                GETDATE(),
                @EmployerId,
                GETUTCDATE(),
                @RoleId
            );

            PRINT 'Inserted TUSerPagesMapping PageId=5. Rows=' + CAST(@@ROWCOUNT AS VARCHAR(10));
        END
        ELSE
            PRINT 'TUSerPagesMapping PageId=5 already present — skipped.';
    END

    ------------------------------------------------------------------------
    -- 2) Access Rights: My Details tabs (replace MenuId=5 rows for this user)
    ------------------------------------------------------------------------
    IF @GrantAccessRightsTabs = 1
    BEGIN
        DELETE FROM dbo.TUserTabDetails
        WHERE UserId = @UserId
          AND Employerid = @EmployerId
          AND MenuId = @MyDetailsMenuId;

        PRINT 'Deleted existing TUserTabDetails MenuId=5. Rows=' + CAST(@@ROWCOUNT AS VARCHAR(10));

        INSERT INTO dbo.TUserTabDetails (
            UserId,
            MenuId,
            TabId,
            Employerid,
            IsEditable,
            CreatedBy,
            CreatedDate
        )
        SELECT
            @UserId,
            t.MenuId,
            t.TabId,
            @EmployerId,
            @IsEditable,
            @CreatedBy,
            CAST(GETDATE() AS DATE)
        FROM #TargetTabs t;

        PRINT 'Inserted TUserTabDetails. Rows=' + CAST(@@ROWCOUNT AS VARCHAR(10));
    END

    ------------------------------------------------------------------------
    -- 3) My Details Setup Permissions (employee overrides)
    ------------------------------------------------------------------------
    IF @GrantMyDetailsSetup = 1
    BEGIN
        DELETE FROM dbo.TEmployeeRoleUserTabDetails
        WHERE EmployeeId = @EmployeeId
          AND Employerid = @EmployerId
          AND RoleId IS NULL;

        PRINT 'Deleted existing employee TEmployeeRoleUserTabDetails. Rows='
            + CAST(@@ROWCOUNT AS VARCHAR(10));

        INSERT INTO dbo.TEmployeeRoleUserTabDetails (
            RoleId,
            EmployeeId,
            ModuleSectionId,
            ModuleTabId,
            Employerid,
            IsEditable,
            CreatedBy,
            CreatedDate,
            CreatedUtcDate,
            UpdatedDate,
            UpdatedBy,
            UpdatedUtcDate
        )
        SELECT
            NULL,
            @EmployeeId,
            s.ModuleSectionId,
            s.ModuleTabId,
            @EmployerId,
            s.IsEditable,
            @CreatedBy,
            CAST(GETDATE() AS DATE),
            GETUTCDATE(),
            GETDATE(),
            @CreatedBy,
            GETUTCDATE()
        FROM #TargetSections s;

        PRINT 'Inserted TEmployeeRoleUserTabDetails. Rows=' + CAST(@@ROWCOUNT AS VARCHAR(10));
    END

    ------------------------------------------------------------------------
    -- Post-write verification
    ------------------------------------------------------------------------
    PRINT '--- After: TUSerPagesMapping ---';
    SELECT *
    FROM dbo.TUSerPagesMapping WITH (NOLOCK)
    WHERE UserID = @UserId
      AND Employerid = @EmployerId
      AND PageId = @MyDetailsMenuId;

    PRINT '--- After: TUserTabDetails count ---';
    SELECT COUNT(*) AS UserTabRows
    FROM dbo.TUserTabDetails WITH (NOLOCK)
    WHERE UserId = @UserId
      AND Employerid = @EmployerId
      AND MenuId = @MyDetailsMenuId;

    PRINT '--- After: TEmployeeRoleUserTabDetails count ---';
    SELECT COUNT(*) AS SetupPermissionRows
    FROM dbo.TEmployeeRoleUserTabDetails WITH (NOLOCK)
    WHERE EmployeeId = @EmployeeId
      AND Employerid = @EmployerId
      AND RoleId IS NULL;

    IF @CommitChanges = 1
    BEGIN
        COMMIT TRANSACTION;
        PRINT 'COMMITTED.';
    END
    ELSE
    BEGIN
        ROLLBACK TRANSACTION;
        PRINT 'ROLLED BACK (set @CommitChanges = 1 to persist).';
    END
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('assign-employee-my-details-permissions failed: %s', 16, 1, @Err);
END CATCH;

IF OBJECT_ID('tempdb..#TargetTabs') IS NOT NULL DROP TABLE #TargetTabs;
IF OBJECT_ID('tempdb..#TargetSections') IS NOT NULL DROP TABLE #TargetSections;
GO
