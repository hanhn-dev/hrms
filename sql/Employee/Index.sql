SELECT TOP 10 * FROM tEmployee WHERE FName LIKE '%Whaley%'

EXEC sp_help 'tEmployee'

SELECT TOP 10 * FROM TDepartment
SELECT TOP 10 * FROM TDepartmentHierarchy
SELECT TOP 10 * FROM TEmployeeDepartmentHistory


EXEC Sp_TnE_SearchEmployee 1430, 10, NULL, 'E', 99

EXEC Sp_AdminRoleM_GetTabRoleDet 10, 1433

EXEC Sp_GetTabUserDetails 10, 1433

SELECT TOP 10 * FROM TOrgHierarchyDetails WHERE Employerid = 10

SELECT * FROM TEmployee WHERE EmployeeId = 1430

-- UPDATE TEmployee SET MiddleName = 'Fleming' WHERE EmployeeId = 1430


SELECT * FROM TEmployee WHERE EmployeeId IN (5958,1436)
SELECT TOP 10 * FROM TEmployeeInfo WHERE EmployeeId IN (5958, 1436, 1710, 1432)
SELECT TOP 10 * FROM TUsers

exec "sp_help" TEmployeeInfo

SELECT EmployeeId FROM [dbo].[FN_LocationBU_GetEmployeeDetails](5958, NULL)

SELECT TOP 100 * FROM TUSerPagesMapping TUSPM
INNER JOIN TUserEmployee AS TUE ON TUE.UserID = TUSPM.UserID
WHERE TUE.EmployeeID = 5958

SELECT * FROM TUserEmployee WHERE EmployeeID = 1430
SELECT * FROM TUSerPagesMapping WHERE UserID = 5886
SELECT * FROM TEmployeeInfo WHERE EmployeeId IN (1430, 5958)

SELECT 
		RoleId,
		EmployerId,
		CASE 
							WHEN IsGlobalAccess = 'Y' THEN EmployerIds 
							ELSE '' 
						END 
	FROM TUsers U WITH (NOLOCK) 
	WHERE U.UserID = 5886

SELECT TOP 1 
		LocationIds,
		BusinessUnitIds
	FROM dbo.TUSerPagesMapping UPM WITH (NOLOCK)
	WHERE UserID = 5886 
	AND EmployerId = 10

-- UPDATE TUSerPagesMapping SET BusinessUnitIds = '6,8,14,15,28,13,32,34,1185' WHERE UserID = 5886 AND Employerid = 10

-- SELECT TOP 1 
-- 		@LocationIds = CASE WHEN ISNULL(@LocationIds,'') = '' THEN RM.LocationIds ELSE @LocationIds + ','+ISNULL(RM.LocationIds,'') END,
-- 		@BusinessUnitIds = CASE WHEN ISNULL( @BusinessUnitIds,'') = '' THEN RM.BusinessUnitIds ELSE @BusinessUnitIds +','+ ISNULL(RM.BusinessUnitIds,'')END
-- 	FROM dbo.TRolePagesMapping RM WITH (NOLOCK) 
-- 	WHERE 1=1
-- 		AND RoleId = 1
-- 		AND EmployerId = 10

SELECT * FROM TUsers WHERE UserID = 1428
SELECT TOP 100 * FROM TRolePagesMapping WHERE RoleID = 4 AND Employerid = 10
-- LocationIds: 1183,1185,19,1170,1173,1175,1177,909,910,908,911
-- BusinessUnitIds: 6,8,14,15,28,13,32,34

UPDATE TRolePagesMapping SET BusinessUnitIds = '6,8,14,15,28,13,32,34,1185' WHERE RoleID = 4 AND Employerid = 10

SELECT TOP 100 * FROM TOrgHierarchyDetails WHERE UnitID IN ( 6,8,14,15,28,13,32,34,1185)

SELECT TOP 100 * FROM TOrgHierarchyDetails WHERE EmployerId = 10
SELECT TOP 100 * FROM TLocation

-- UPDATE TUSerPagesMapping SET LocationIds = '1183,1185,19,1170,1173,1175,1177,909,910,908,911', BusinessUnitIds = '6,8,14,15,28,13,32,34' WHERE UserID = 5886
-- UPDATE TEmployeeInfo SET LocationId = 19, BusinessUnitId = 1185 WHERE EmployeeId = 5958

SELECT TOP 10 * FROM TEmployerDetails
SELECT * FROM TUsers WHERE EmployerId = 10 AND UserId = 5886
SELECT TOP 10 * FROM TUserEmployee WHERE EmployeeId = 5958

SELECT * FROM TRoles WHERE Employerid = 10

-- UPDATE TRoles SET RoleType = 'Administrator' WHERE RoleType = 'Adminstrator'

-- SELECT * FROM TEmployee WHERE Employerid = 10
-- UPDATE TEmployee SET IsActive = 'Y' WHERE EmployeeId = 5958

SELECT [TEmployee].[EmployeeId], [TEmployee].[Employerid] AS [EmployerId], [Employer].[Employerid] AS [Employer.Employerid], [Employer].[EmployerId] AS [Employer.EmployerId], [Employer].[EmployerName] AS [Employer.EmployerName], [Users].[UserID] AS [Users.UserID], "Role"."RoleName" AS [Users.RoleName], [Users->TUserEmployee].[UserID] AS [Users.TUserEmployee.UserID], [Users->TUserEmployee].[EmployeeID] AS [Users.TUserEmployee.EmployeeID]
FROM [dbo].[TEmployee] AS [TEmployee] INNER JOIN [dbo].[TEmployerDetails] AS [Employer] ON [TEmployee].[Employerid] = [Employer].[Employerid] LEFT OUTER JOIN ( [TUserEmployee] AS [Users->TUserEmployee] INNER JOIN [dbo].[TUsers] AS [Users] ON [Users].[UserID] = [Users->TUserEmployee].[UserID]) ON [TEmployee].[EmployeeId] = [Users->TUserEmployee].[EmployeeID] LEFT OUTER JOIN [dbo].[TRoles] AS [Users->Role] ON [Users].[RoleID] = [Users->Role].[RoleID]
WHERE [TEmployee].[EmployeeId] = N'1431';


SELECT TOP 10 * FROM TEmployee WHERE Employerid = 10 AND IsActive = 'Y' ORDER BY CreatedDate DESC