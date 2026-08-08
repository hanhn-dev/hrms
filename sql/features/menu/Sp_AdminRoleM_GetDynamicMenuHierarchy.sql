DECLARE @EmployerId INT = 10

EXEC Sp_AdminRoleM_GetDynamicMenuHierarchy @EmployerId

EXEC sp_GetDynamicMenuItems 1430, 10

EXEC Sp_GetMenuTabDetails @EmployerId, ''

SELECT * FROM TTabDetails WHERE TabName like '%Leave%'

SELECT * FROM TMenuDetails where MenuId = 20

SELECT * FROM TMenuDetails WHERE Employerid = 0

SELECT * FROM Tw
SELECT*  FROM TWorkflowDetails