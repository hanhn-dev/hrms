DECLARE @EmployeeId INT = 1710,
        @EmployerId INT = 10;

EXEC SP_CheckIsEmployeeApprover @EmployeeId, @EmployerId