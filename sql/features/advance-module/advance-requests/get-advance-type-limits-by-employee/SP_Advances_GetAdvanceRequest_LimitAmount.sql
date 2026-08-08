DECLARE @EmployerId INT = 10,
        @EmployeeId INT = 1430;

EXEC SP_Advances_GetAdvanceRequest_LimitAmount @EmployerId, @EmployeeId

-- SELECT * FROM TCustomerSettings WHERE EmployerId = @EmployerId

-- UPDATE TCustomerSettings SET AdvanceBasedOn = 'G' WHERE Id = 11