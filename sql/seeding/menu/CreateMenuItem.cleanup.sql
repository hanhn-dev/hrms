/* =============================================================================
   Remove a menu item created by ./CreateMenuItem.sql.

   Matches by @TargetEmployerId + @MenuId. Deletes tMenuDetails and
   TMenuHierarchy for that employer, plus the global TModuleMenuMapping row
   for that MenuId (safe here because CreateMenuItem.sql always mints a fresh
   MenuId via MAX(MenuId)+1 across the whole table, so no other employer's
   row shares it -- unless the real admin tool later propagated this exact
   MenuId to other employers, which this script checks for and warns about
   instead of silently deleting).

   Also cleans up any TRolePagesMapping / TUSerPagesMapping rows for this
   MenuId + employer, in case AssignMenuAccess.sql already ran (their
   *History rows are left alone as an audit trail, matching how
   Sp_InsRolePagesMapping only ever appends to history, never deletes from it).

   Does NOT touch dbo.TDynamicMenuHierarchy (CreateMenuItem.sql never wrote to
   it either).
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT = 0;    -- <<< SET THIS
DECLARE @MenuId           INT = 0;    -- <<< SET THIS (printed by CreateMenuItem.sql)
DECLARE @DryRun            BIT = 0;    -- <<< 1 = list matches only

IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId before running this cleanup script.', 1;
IF @MenuId <= 0
    THROW 50000, 'Set @MenuId before running this cleanup script.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId)
BEGIN
    PRINT 'No tMenuDetails row found for Employerid = ' + CAST(@TargetEmployerId AS VARCHAR(10))
        + ', MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + '. Nothing to do.';
    RETURN;
END

IF EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId AND Employerid <> @TargetEmployerId)
    PRINT 'WARNING: MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' also exists for OTHER employers -- '
        + 'this cleanup only removes the row for Employerid ' + CAST(@TargetEmployerId AS VARCHAR(10))
        + ', but TModuleMenuMapping has no Employerid column, so deleting it here would affect those other employers too. Skipping TModuleMenuMapping deletion.';

PRINT '--- Rows targeted for deletion ---';
SELECT 'tMenuDetails' AS Obj, * FROM dbo.tMenuDetails WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;
SELECT 'TMenuHierarchy' AS Obj, * FROM dbo.TMenuHierarchy WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;
SELECT 'TRolePagesMapping' AS Obj, * FROM dbo.TRolePagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
SELECT 'TUSerPagesMapping' AS Obj, * FROM dbo.TUSerPagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;

IF @DryRun = 1
BEGIN
    PRINT 'Dry run only -- no rows deleted. Set @DryRun = 0 to proceed.';
    RETURN;
END

------------------------------------------------------------------------------
-- 2. DELETE
------------------------------------------------------------------------------
BEGIN TRAN CleanupMenuItem;

    DELETE FROM dbo.TRolePagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
    DELETE FROM dbo.TUSerPagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
    DELETE FROM dbo.TMenuHierarchy    WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;
    DELETE FROM dbo.tMenuDetails      WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;

    IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId)
        DELETE FROM dbo.TModuleMenuMapping WHERE MenuId = @MenuId;

COMMIT TRAN CleanupMenuItem;

PRINT 'Deleted MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + ' for Employerid = ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '.';
