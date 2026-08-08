DECLARE @EmployeeId INT = 1430,
        @EmployerId INT = 10,
        @UserType VARCHAR(10) = 'E'

EXEC Sp_Get_UserMenuTab_Details @EmployeeId, @EmployerId, @UserType