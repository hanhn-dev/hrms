/** Get Employee Information **/

DECLARE @EmployeeId INT = 1431

EXEC SP_CM_GetEmployeeFullInformation @EmployeeId

EXEC sp_helptext 'SP_CM_GetEmployeeFullInformation'
EXEC sp_help 'TEmployeeInfo'

SELECT TOP 10 * FROM TEmployee

SELECT TOP 100 * FROM TEmployeeInfo WHERE EmployeeId = 1430
SELECT TOP 100 * FROM TEmployeeInfo WHERE EmployeeId = 5958

SELECT * FROM TBusinessUnit 

SELECT TOP 100 * FROM TOrgHierarchyDetails WHERE Employerid = 10

-- UPDATE TEmployeeInfo SET BusinessUnitId = 1185 WHERE EmployeeId = 5958
