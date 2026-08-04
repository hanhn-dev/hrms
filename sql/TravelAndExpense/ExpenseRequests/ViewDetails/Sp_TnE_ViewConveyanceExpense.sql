DECLARE @pExpenseId INT = 12406,
        @pEmployerId INT = 10;

EXEC Sp_TnE_ViewConveyanceExpense @pExpenseId, @pEmployerId