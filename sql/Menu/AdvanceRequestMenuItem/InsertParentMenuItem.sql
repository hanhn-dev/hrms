DECLARE @MenuId INT;
DECLARE @MenuName VARCHAR(50) = 'Advances';
DECLARE @NavigateURL VARCHAR(50) = '#';
DECLARE @PageName VARCHAR(50) = 'NULL';
DECLARE @EmployerId INT = 10;
DECLARE @Icon VARCHAR(50) = 'expense';
DECLARE @ParentMenuId INT = NULL;
DECLARE @Parentseq INT;

SELECT @MenuId = 1157

SELECT @Parentseq = MAX( parentseq)  FROM TMenuHierarchy 

IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId= @MenuId AND MenuName=@MenuName AND Employerid=@EmployerId)
BEGIN
    INSERT INTO dbo.tMenuDetails
    (
        MenuId,
        MenuName,
        NavigateURL,
        PageName,
        ISActive,
        Employerid,
        CreatedBy,
        CreatedDate,
        iconname
    )
    VALUES
    (   @MenuId,
        @MenuName,
        @NavigateURL,
        @PageName,
        1,
        @EmployerId,
        -1,
        GETDATE(),
        @Icon
    )
END

IF NOT EXISTS (SELECT 1 FROM dbo.TMenuHierarchy WHERE MenuId=@MenuId AND Employerid=@EmployerId)
BEGIN
    INSERT INTO dbo.TMenuHierarchy
    (
        MenuId,
        ParentMenuId,
        CreateDate,
        CreatedBy,
        Employerid,
        parentseq
    )
    VALUES
    (   @MenuId,
        @ParentMenuId,
        GETDATE(),
        -1,
        @EmployerId,
        @Parentseq
    )
END

IF NOT EXISTS (SELECT 1 FROM dbo.TRolePagesMapping WHERE PageId=@MenuId AND Employerid=@EmployerId)
BEGIN
    INSERT INTO dbo.TRolePagesMapping(RoleId, PageId, CreatedBy, CreationDate, UpdatedBy, UpdatedDate, EmployerId, CreationDateUtcTime)
    SELECT
    RoleId,
    @MenuId AS PageId,
    -1 AS CreatedBy,
    GETDATE() AS CreationDate,
    -1 AS UpdatedBy,
    GETDATE() AS UpdatedDate,
    @EmployerId AS EmployerId,
    GETUTCDATE() AS CreationDateUtcTime
    FROM dbo.TRoles
    WHERE Employerid = @EmployerId OR (RoleID IN (1, 4, 348)) --Admin
END