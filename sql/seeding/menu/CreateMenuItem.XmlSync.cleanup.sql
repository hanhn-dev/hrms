/* =============================================================================
   Remove a menu item created by ./CreateMenuItem.XmlSync.sql.

   Same as ./CreateMenuItem.cleanup.sql (tMenuDetails, TMenuHierarchy,
   TModuleMenuMapping, any TRolePagesMapping/TUSerPagesMapping grants), PLUS
   surgically removes the matching <Node Value="@MenuId"/> from this
   employer's TDynamicMenuHierarchy XML, archiving the pre-removal XML into
   TDynamicMenuHierarchyHistory first (same pattern the create script uses).

   Uses the same NVARCHAR(MAX) hop before casting to XML as the create
   script -- casting the raw VARCHAR(MAX) directly fails with "XML parsing:
   unable to switch the encoding" because of the stored encoding="utf-16"
   prolog.
   ========================================================================== */

SET NOCOUNT ON;

------------------------------------------------------------------------------
-- 1. CONFIGURATION
------------------------------------------------------------------------------
DECLARE @TargetEmployerId INT = 0;    -- <<< SET THIS
DECLARE @MenuId           INT = 0;    -- <<< SET THIS (printed by CreateMenuItem.XmlSync.sql)
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

DECLARE @MenuIdStr VARCHAR(20) = CAST(@MenuId AS VARCHAR(20));
DECLARE @CurrentXmlVarchar VARCHAR(MAX) = (
    SELECT TOP (1) DynamicMenuXML FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId ORDER BY Transid DESC
);
DECLARE @NodeExistsInXml BIT = 0;
IF @CurrentXmlVarchar IS NOT NULL
BEGIN
    DECLARE @CurrentXml XML = CAST(CAST(@CurrentXmlVarchar AS NVARCHAR(MAX)) AS XML);
    IF @CurrentXml.exist('(//Node[@Value=sql:variable("@MenuIdStr")])[1]') = 1
        SET @NodeExistsInXml = 1;
END

PRINT '--- Rows targeted for deletion ---';
SELECT 'tMenuDetails' AS Obj, * FROM dbo.tMenuDetails WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;
SELECT 'TMenuHierarchy' AS Obj, * FROM dbo.TMenuHierarchy WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;
SELECT 'TRolePagesMapping' AS Obj, * FROM dbo.TRolePagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
SELECT 'TUSerPagesMapping' AS Obj, * FROM dbo.TUSerPagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
PRINT 'Node present in current TDynamicMenuHierarchy XML for this employer: ' + CASE WHEN @NodeExistsInXml = 1 THEN 'YES -- will be removed' ELSE 'no (nothing to remove there)' END;

IF @DryRun = 1
BEGIN
    PRINT 'Dry run only -- no rows deleted. Set @DryRun = 0 to proceed.';
    RETURN;
END

------------------------------------------------------------------------------
-- 2. DELETE
------------------------------------------------------------------------------
BEGIN TRAN CleanupMenuItemXmlSync;

    IF @NodeExistsInXml = 1
    BEGIN
        INSERT INTO dbo.TDynamicMenuHierarchyHistory (Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid)
        SELECT Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate, employerid
        FROM dbo.TDynamicMenuHierarchy
        WHERE employerid = @TargetEmployerId;

        DECLARE @UpdatedXml XML = CAST(CAST(@CurrentXmlVarchar AS NVARCHAR(MAX)) AS XML);
        SET @UpdatedXml.modify('delete (//Node[@Value=sql:variable("@MenuIdStr")])[1]');

        DECLARE @UpdatedXmlText VARCHAR(MAX) = '<?xml version="1.0" encoding="utf-16"?>' + CHAR(13) + CHAR(10)
            + CAST(CAST(@UpdatedXml AS NVARCHAR(MAX)) AS VARCHAR(MAX));

        DELETE FROM dbo.TDynamicMenuHierarchy WHERE employerid = @TargetEmployerId;

        INSERT INTO dbo.TDynamicMenuHierarchy (DynamicMenuXML, Createdby, Createdate, employerid)
        VALUES (@UpdatedXmlText, 1, GETDATE(), @TargetEmployerId);
    END

    DELETE FROM dbo.TRolePagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
    DELETE FROM dbo.TUSerPagesMapping WHERE Employerid = @TargetEmployerId AND PageId = @MenuId;
    DELETE FROM dbo.TMenuHierarchy    WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;
    DELETE FROM dbo.tMenuDetails      WHERE Employerid = @TargetEmployerId AND MenuId = @MenuId;

    IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId = @MenuId)
        DELETE FROM dbo.TModuleMenuMapping WHERE MenuId = @MenuId;

COMMIT TRAN CleanupMenuItemXmlSync;

PRINT 'Deleted MenuId = ' + CAST(@MenuId AS VARCHAR(10)) + ' for Employerid = ' + CAST(@TargetEmployerId AS VARCHAR(10)) + ' (tables + XML).';
