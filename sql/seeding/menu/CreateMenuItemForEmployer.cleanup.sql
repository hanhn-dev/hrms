/* =============================================================================
   Remove a menu item created by ./CreateMenuItemForEmployer.sql from BOTH
   Employerid = 0 and the target employer it was propagated to.

   Removes tMenuDetails/TMenuHierarchy rows at both employers, the global
   TModuleMenuMapping row, any TRolePagesMapping/TUSerPagesMapping grants at
   the target employer, and the matching <Node Value="@MenuId"/> from
   TDynamicMenuHierarchy XML wherever it exists (employer 0 always; the
   target employer only if it had one to begin with).
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @MenuId           INT = 0;    -- <<< SET THIS (printed by CreateMenuItemForEmployer.sql)
DECLARE @TargetEmployerId INT = 0;    -- <<< SET THIS (the tenant it was propagated to)
DECLARE @DryRun            BIT = 1;    -- <<< 1 = list matches only (default ON -- this touches employer 0)

IF @MenuId <= 0
    THROW 50000, 'Set @MenuId before running this cleanup script.', 1;
IF @TargetEmployerId <= 0
    THROW 50000, 'Set @TargetEmployerId before running this cleanup script.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId AND Employerid = 0)
BEGIN
    PRINT 'No tMenuDetails row found for MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + ' at Employerid = 0. Nothing to do.';
    RETURN;
END

IF EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId AND Employerid NOT IN (0, @TargetEmployerId))
    PRINT 'WARNING: MenuId ' + CAST(@MenuId AS VARCHAR(10)) + ' also exists for OTHER employers beyond 0 and '
        + CAST(@TargetEmployerId AS VARCHAR(10)) + ' -- this cleanup only removes rows for those two, but '
        + 'TModuleMenuMapping has no Employerid column, so deleting it would affect those other employers too. Skipping TModuleMenuMapping deletion.';

DECLARE @MenuIdStr VARCHAR(20) = CAST(@MenuId AS VARCHAR(20));

PRINT '--- Rows targeted for deletion ---';
SELECT 'tMenuDetails' AS Obj, * FROM dbo.tMenuDetails WHERE MenuId = @MenuId AND Employerid IN (0, @TargetEmployerId);
SELECT 'TMenuHierarchy' AS Obj, * FROM dbo.TMenuHierarchy WHERE MenuId = @MenuId AND Employerid IN (0, @TargetEmployerId);
SELECT 'TRolePagesMapping' AS Obj, * FROM dbo.TRolePagesMapping WHERE PageId = @MenuId AND Employerid = @TargetEmployerId;
SELECT 'TUSerPagesMapping' AS Obj, * FROM dbo.TUSerPagesMapping WHERE PageId = @MenuId AND Employerid = @TargetEmployerId;

IF @DryRun = 1
BEGIN
    PRINT 'Dry run only -- no rows deleted. Set @DryRun = 0 to proceed.';
    RETURN;
END

------------------------------------------------------------------------------
-- 2. DELETE
------------------------------------------------------------------------------
BEGIN TRAN CleanupMenuItemForEmployer;

    DECLARE @Emp INT;
    DECLARE EmpCursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT DISTINCT employerid FROM dbo.TDynamicMenuHierarchy
        WHERE employerid IN (0, @TargetEmployerId)
          AND CAST(CAST(DynamicMenuXML AS NVARCHAR(MAX)) AS XML).exist('(//Node[@Value=sql:variable("@MenuIdStr")])[1]') = 1;
    OPEN EmpCursor;
    FETCH NEXT FROM EmpCursor INTO @Emp;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @XmlVarchar VARCHAR(MAX) = (SELECT TOP (1) DynamicMenuXML FROM dbo.TDynamicMenuHierarchy WHERE employerid = @Emp ORDER BY Transid DESC);

        INSERT INTO dbo.TDynamicMenuHierarchyHistory (Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid)
        SELECT Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid
        FROM dbo.TDynamicMenuHierarchy WHERE employerid = @Emp;

        DECLARE @Xml XML = CAST(CAST(@XmlVarchar AS NVARCHAR(MAX)) AS XML);
        SET @Xml.modify('delete (//Node[@Value=sql:variable("@MenuIdStr")])[1]');

        DECLARE @XmlText VARCHAR(MAX) = '<?xml version="1.0" encoding="utf-16"?>' + CHAR(13) + CHAR(10)
            + CAST(CAST(@Xml AS NVARCHAR(MAX)) AS VARCHAR(MAX));

        DELETE FROM dbo.TDynamicMenuHierarchy WHERE employerid = @Emp;
        INSERT INTO dbo.TDynamicMenuHierarchy (DynamicMenuXML, Createdby, Createdate, employerid)
        VALUES (@XmlText, 1, GETDATE(), @Emp);

        FETCH NEXT FROM EmpCursor INTO @Emp;
    END
    CLOSE EmpCursor;
    DEALLOCATE EmpCursor;

    DELETE FROM dbo.TRolePagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
    DELETE FROM dbo.TUSerPagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
    DELETE FROM dbo.TMenuHierarchy    WHERE MenuId = @MenuId AND Employerid IN (0, @TargetEmployerId);
    DELETE FROM dbo.tMenuDetails      WHERE MenuId = @MenuId AND Employerid IN (0, @TargetEmployerId);

    IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId)
        DELETE FROM dbo.TModuleMenuMapping WHERE MenuId = @MenuId;

COMMIT TRAN CleanupMenuItemForEmployer;

PRINT 'Deleted MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + ' from Employerid 0 and ' + CAST(@TargetEmployerId AS VARCHAR(10)) + ' (tables + XML where present).';
