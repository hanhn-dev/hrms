DECLARE @EmployerID INT = 10,
    @EmployeeID INT = 1430,
    @ExpenseTypeID INT = 703,
    @SubExpenseTypeID INT = 754,
    @MaxLimit DECIMAL(8,2) = 100000,
    @CurrencyId INT = 99,
    @EffectiveFrom DATETIME = '2024-06-02',
    @CityCategoryID INT = NULL,
	@ConveyanceMinDate DATETIME 
EXEC dbo.GetExpenseLimit @EmployerID,
    @EmployeeID,
    @ExpenseTypeID,
    @SubExpenseTypeID,
    @MaxLimit,
    @CurrencyId,
    @EffectiveFrom,
    @CityCategoryID,
	@ConveyanceMinDate OUTPUT
 
SELECT @ConveyanceMinDate

/***** Travel Parameters *****
DECLARE @EmployerID INT = 10,
	@EmployeeID INT = 1430,
	@ExpenseTypeID INT = 701,
	@SubExpenseTypeID INT = 201,
	@MaxLimit DECIMAL(8,2) = 1000,
	@CurrencyId INT = 99,
	@EffectiveFrom DATETIME = '2024-05-27',
	@CityCategoryID INT = NULL
*/

/***** Conveyance Parameters *****
DECLARE @EmployerID INT = 10,
	@EmployeeID INT = 1430,
	@ExpenseTypeID INT = 703,
	@SubExpenseTypeID INT = 753,
	@MaxLimit DECIMAL(8,2) = 0,
	@CurrencyId INT = 99,
	@EffectiveFrom DATETIME = '2024-05-27',
	@CityCategoryID INT = NULL
*/