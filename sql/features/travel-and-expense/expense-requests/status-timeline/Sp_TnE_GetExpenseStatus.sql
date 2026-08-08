DECLARE @ExpenseId INT = 9335,
        @EmployerId INT = 10;

EXEC Sp_TnE_GetExpenseStatus @ExpenseId, @EmployerId