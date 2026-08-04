DECLARE @EmployerId INT = 10,
        @EmployeeId INT = 1431;

EXEC SP_AdminWM_GetLocationByEmployeeId @EmployeeId, @EmployerId