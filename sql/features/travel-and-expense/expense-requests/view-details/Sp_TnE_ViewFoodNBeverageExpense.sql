DECLARE @pExpenseId INT = 11389,
        @pEmployerId INT = 10;

EXEC Sp_TnE_ViewFoodNBeverageExpense @pExpenseId, @pEmployerId;