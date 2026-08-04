DECLARE @ExpenseId INT = 10381,
        @EmployerId INT = 10;

EXEC Sp_TnE_GetExpenseRequestStatusDetails @ExpenseId, @EmployerId

DECLARE @EmployeeId INT = 5958;

SELECT * FROM [dbo].Fn_GetEmployeeName(@EmployeeId)
