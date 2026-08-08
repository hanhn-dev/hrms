/* =============================================================================
   Fix empty left menu for a tenant created by an earlier version of
   seed-new-employer-performance-test.sql that did not clone menu / role-page
   access rows.

   sp_GetDynamicMenuItems builds the sidebar from:
     TUsers -> TRolePagesMapping -> TMenuHierarchy -> tMenuDetails
   all filtered by Employerid. Without those rows the dashboard loads but the
   left menu is blank.

   Also clones TRoleTabDetails for RoleID 1/3/4 so in-page tabs render.

   Edit @CustId (or set @EmployerId / @TemplateEmployerId directly), then run.
   Idempotent: deletes any existing menu/role-page/tab rows for the target
   employer before re-cloning from the template.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @CustId             VARCHAR(10) = 'C00232';
DECLARE @TemplateEmployerId INT         = 10;      -- same template the seed used
DECLARE @EmployerId         INT =
    (SELECT Employerid FROM dbo.TEmployerDetails WHERE custid = @CustId);

IF @EmployerId IS NULL
    THROW 50000, 'Employer not found for that custid.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.TEmployerDetails WHERE Employerid = @TemplateEmployerId)
    THROW 50000, 'TemplateEmployerId does not exist.', 1;

-- Include child-org Location/Unit IDs so All Employees (FN_LocationBU...) can
-- return staff from selected child employers. Parent-only CSVs leave the count
-- stuck at the root employer headcount even when child orgs are selected.
DECLARE @NewLocationIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(LocationId AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY LocationId)
        FROM (
            SELECT DISTINCT l.LocationId
            FROM dbo.TLocation l
            WHERE l.Employerid = @EmployerId
               OR l.Employerid IN (
                    SELECT Employerid
                    FROM dbo.TEmployerDetails
                    WHERE ParentEmployerid = @EmployerId
                )
        ) locs
    );
DECLARE @NewBusinessUnitIds VARCHAR(MAX) =
    (
        SELECT STRING_AGG(CAST(UnitID AS VARCHAR(20)), ',') WITHIN GROUP (ORDER BY UnitID)
        FROM (
            SELECT DISTINCT u.UnitID
            FROM dbo.TOrgHierarchyDetails u
            WHERE ISNULL(u.isactive, 'Y') = 'Y'
              AND ISNULL(u.isdelete, 'N') <> 'Y'
              AND (
                    u.Employerid = @EmployerId
                    OR u.Employerid IN (
                        SELECT Employerid
                        FROM dbo.TEmployerDetails
                        WHERE ParentEmployerid = @EmployerId
                    )
                  )
        ) units
    );

IF @NewLocationIds IS NULL OR @NewBusinessUnitIds IS NULL
    THROW 50000, 'Target employer tree has no TLocation / TOrgHierarchyDetails rows -- re-run the seed or clone master data first.', 1;

BEGIN TRAN FixMenuAccess;

    DELETE FROM dbo.TRoleTabDetails   WHERE Employerid = @EmployerId AND RoleID IN (1, 3, 4);
    DELETE FROM dbo.TRolePagesMapping WHERE Employerid = @EmployerId AND RoleID IN (1, 3, 4);
    DELETE FROM dbo.tMenuDetails      WHERE Employerid = @EmployerId;
    DELETE FROM dbo.TMenuHierarchy    WHERE Employerid = @EmployerId;

    INSERT INTO dbo.TMenuHierarchy (MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq)
    SELECT MenuId, ParentMenuId, GETDATE(), CreatedBy, @EmployerId, parentseq
    FROM dbo.TMenuHierarchy
    WHERE Employerid = @TemplateEmployerId;

    INSERT INTO dbo.tMenuDetails (MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname, TabName)
    SELECT MenuId, MenuName, NavigateURL, PageName, ISActive, @EmployerId, CreatedBy, GETDATE(), iconname, TabName
    FROM dbo.tMenuDetails
    WHERE Employerid = @TemplateEmployerId;

    INSERT INTO dbo.TRolePagesMapping
        (RoleID, PageId, CreatedBy, CreationDate, Employerid, CreationDateUtcTime, LocationIds, BusinessUnitIds)
    SELECT RoleID, PageId, ISNULL(CreatedBy, 1), GETDATE(), @EmployerId, GETUTCDATE(),
           @NewLocationIds, @NewBusinessUnitIds
    FROM dbo.TRolePagesMapping
    WHERE Employerid = @TemplateEmployerId
      AND RoleID IN (1, 3, 4);

    INSERT INTO dbo.TRoleTabDetails (RoleId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
    SELECT RoleId, MenuId, TabId, @EmployerId, IsEditable, ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE)
    FROM dbo.TRoleTabDetails
    WHERE Employerid = @TemplateEmployerId
      AND RoleID IN (1, 3, 4);

    -- Template 10 has MenuId=5 (My Details tabs) only on custom roles, not 1/3/4.
    -- Clone those from a healthy employer so Admin/Manager/Employee get tab access.
    IF NOT EXISTS (
        SELECT 1 FROM dbo.TRoleTabDetails
        WHERE Employerid = @EmployerId AND MenuId = 5 AND RoleID IN (1, 3, 4)
    )
    BEGIN
        DECLARE @RoleTabSourceId INT = 1;
        INSERT INTO dbo.TRoleTabDetails (RoleId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
        SELECT RoleId, MenuId, TabId, @EmployerId, IsEditable, ISNULL(CreatedBy, 1), CAST(GETDATE() AS DATE)
        FROM dbo.TRoleTabDetails
        WHERE Employerid = @RoleTabSourceId
          AND MenuId = 5
          AND RoleID IN (1, 3, 4);
    END

COMMIT TRAN FixMenuAccess;

SELECT 'TMenuHierarchy' AS Obj, COUNT(*) AS Cnt FROM dbo.TMenuHierarchy WHERE Employerid = @EmployerId
UNION ALL
SELECT 'tMenuDetails', COUNT(*) FROM dbo.tMenuDetails WHERE Employerid = @EmployerId
UNION ALL
SELECT 'TRolePagesMapping (1/3/4)', COUNT(*) FROM dbo.TRolePagesMapping WHERE Employerid = @EmployerId AND RoleID IN (1,3,4)
UNION ALL
SELECT 'TRoleTabDetails (1/3/4)', COUNT(*) FROM dbo.TRoleTabDetails WHERE Employerid = @EmployerId AND RoleID IN (1,3,4);

PRINT 'Menu/role-page access cloned onto Employerid ' + CAST(@EmployerId AS VARCHAR(10))
    + ' (custid ' + @CustId + ') from template ' + CAST(@TemplateEmployerId AS VARCHAR(10)) + '.';
PRINT 'Sign out and back in (or hard-refresh) for the left menu to reload.';
