DECLARE @MenuId INT = 1157,
        @EmployerId INT = 10;

Sp_AdminRoleM_GetTabRoleDet

SELECT MAX(MenuId) FROM tMenuDetails

SELECT * FROM tMenuDetails WHERE MenuName = 'Recruitment'

SELECT * FROM tMenuDetails WHERE MenuId = @MenuId

SELECT * FROM TMenuHierarchy WHERE Employerid = @EmployerId
SELECT TOP 10 * FROM TMenuHierarchy ORDER BY MenuId DESC
SELECT * FROM TDynamicMenuHierarchy WHERE employerid = @EmployerId


SELECT TOP 10 * FROM tMenuDetails WHERE MenuName LIKE '%Advance%'
SELECT TOP 10 * FROM tMenuDetails ORDER BY MenuId DESC


-- INSERT INTO dbo.TRolePagesMapping(RoleId, PageId, CreatedBy, CreationDate, UpdatedBy, UpdatedDate, EmployerId, CreationDateUtcTime)
--     SELECT
--     RoleId,
--     1158 AS PageId,
--     -1 AS CreatedBy,
--     GETDATE() AS CreationDate,
--     -1 AS UpdatedBy,
--     GETDATE() AS UpdatedDate,
--     10 AS EmployerId,
--     GETUTCDATE() AS CreationDateUtcTime
--     FROM dbo.TRoles
--     WHERE Employerid = 10 OR (RoleID IN (1, 4, 332, 348))

SELECT * FROM TRoleTabDetails

SELECT * FROM TUserEmployee WHERE EmployeeID = 1436
SELECT * FROM TUsers WHERE UserID = 1436
SELECT * FROM tUserTabDetails WhERE UserId = 1434 AND MenuId = 1168
SELECT * FROM TTabDetails WhERE MenuId IN (4, 1168, 1158)
SELECT * FROM tMenuDetails WHERE MenuId IN (1157, 1158)
SELECT * FROM TMenuHierarchy WHERE MenuId = 1158
SELECT * FROM tMenuDetails ORDER BY MenuId DESC
SELECT * FROM TTabDetails ORDER BY Tabid DESC

SELECT * FROM tMenuDetails WHERE MenuName LIKE '%Employee Creation'
-- DELETE FROM TUserTabDetails WHERE UserTabid IN (7445, 7446)

-- UPDATE TTabDetails SET IsActive = 'Y', CreatedBy = NULL WHERE Tabid IN (345, 346)

EXEC sp_help 'TTabDetails'