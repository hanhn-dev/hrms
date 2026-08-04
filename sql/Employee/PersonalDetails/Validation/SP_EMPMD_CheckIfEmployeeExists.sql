DECLARE @TaxId VARCHAR(MAX) = 'Test',
        @EmployerId INT = 10;

EXEC SP_EMPMD_CheckIfEmployeeExists @TaxId, @EmployerId