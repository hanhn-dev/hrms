DECLARE @RoleID INT = 1,
        @EmployerID INT = 10,
        @SearchType VARCHAR(1) = 'E',
        @EmployeeID INT = 1431

EXEC Sp_TnE_GetClaimsForEmployeeAndRole @RoleID, @EmployerID, @SearchType, @EmployeeID

sp_helptext 'Sp_TnE_GetClaimsForEmployeeAndRole'