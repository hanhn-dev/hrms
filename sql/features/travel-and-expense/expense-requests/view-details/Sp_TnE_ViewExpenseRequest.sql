DECLARE @ExpenseId INT = 12406,
        @EmployerId INT = 10,
        @EmployeeId INT = 1430;


EXEC Sp_TnE_ViewExpenseRequest @ExpenseId, @EmployerId, @EmployeeId

EXEC Sp_TnE_ViewFoodNBeverageExpense