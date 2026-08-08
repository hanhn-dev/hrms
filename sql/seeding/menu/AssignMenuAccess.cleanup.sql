/* =============================================================================
   Revoke a menu-access grant created by ./AssignMenuAccess.sql.

   Matches by @TargetEmployerId + @MenuId + (@RoleId or @UserId). Deletes only
   the TRolePagesMapping or TUSerPagesMapping row -- their *History rows are
   left alone as an audit trail, matching how the app's own
   Sp_InsRolePagesMapping only ever appends to history, never deletes from it.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT = 0;    -- <<< SET THIS
DECLARE @MenuId           INT = 0;    -- <<< SET THIS
DECLARE @DryRun            BIT = 0;    -- <<< 1 = list matches only

-- Set EXACTLY ONE of the two, matching what AssignMenuAccess.sql was run with:
DECLARE @RoleId INT = NULL;
DECLARE @UserId INT = NULL;

IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId before running this cleanup script.', 1;
IF @MenuId <= 0
    THROW 50000, 'Set @MenuId before running this cleanup script.', 1;
IF (@RoleId IS NULL AND @UserId IS NULL) OR (@RoleId IS NOT NULL AND @UserId IS NOT NULL)
    THROW 50000, 'Set exactly one of @RoleId or @UserId (not both, not neither).', 1;

------------------------------------------------------------------------------
-- 2. RESOLVE + DELETE
------------------------------------------------------------------------------
IF @RoleId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.TRolePagesMapping WHERE RoleID = @RoleId AND PageId = @MenuId AND Employerid = @TargetEmployerId)
    BEGIN
        PRINT 'No TRolePagesMapping row found for RoleID = ' + CAST(@RoleId AS VARCHAR(10))
            + ', MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + ', Employerid = ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '. Nothing to do.';
        RETURN;
    END

    PRINT '--- Row targeted for deletion ---';
    SELECT * FROM dbo.TRolePagesMapping WHERE RoleID = @RoleId AND PageId = @MenuId AND Employerid = @TargetEmployerId;

    IF @DryRun = 1
    BEGIN
        PRINT 'Dry run only -- no rows deleted. Set @DryRun = 0 to proceed.';
        RETURN;
    END

    DELETE FROM dbo.TRolePagesMapping WHERE RoleID = @RoleId AND PageId = @MenuId AND Employerid = @TargetEmployerId;
    PRINT 'Revoked MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' from RoleID ' + CAST(@RoleId AS VARCHAR(10)) + '.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.TUSerPagesMapping WHERE UserID = @UserId AND PageId = @MenuId AND Employerid = @TargetEmployerId)
    BEGIN
        PRINT 'No TUSerPagesMapping row found for UserID = ' + CAST(@UserId AS VARCHAR(10))
            + ', MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + ', Employerid = ' + CAST(@TargetEmployerId AS VARCHAR(10)) + '. Nothing to do.';
        RETURN;
    END

    PRINT '--- Row targeted for deletion ---';
    SELECT * FROM dbo.TUSerPagesMapping WHERE UserID = @UserId AND PageId = @MenuId AND Employerid = @TargetEmployerId;

    IF @DryRun = 1
    BEGIN
        PRINT 'Dry run only -- no rows deleted. Set @DryRun = 0 to proceed.';
        RETURN;
    END

    DELETE FROM dbo.TUSerPagesMapping WHERE UserID = @UserId AND PageId = @MenuId AND Employerid = @TargetEmployerId;
    PRINT 'Revoked MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' from UserID ' + CAST(@UserId AS VARCHAR(10)) + '.';
END
