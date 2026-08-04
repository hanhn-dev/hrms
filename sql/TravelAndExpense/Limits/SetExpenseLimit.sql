DECLARE @ExpenseID INT = 0,
        @LimitID INT = 0,
        @LoginID INT = 0;

EXEC dbo.SetExpenseLimit @ExpenseID, @LimitID, @LoginID


SELECT * FROM TExpense_Limit