DECLARE @EmployeeId INT = 1431,
        @EmployerId INT = 10;

EXEC SP_GetEmployeePreferences @EmployeeId, @EmployerId
SELECT TOP 100 * FROM TEmployeeHomePagePreferences WHERE EmployeeId = 1431



