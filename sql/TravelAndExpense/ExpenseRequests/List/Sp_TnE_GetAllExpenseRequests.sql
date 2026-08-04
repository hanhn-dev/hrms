DECLARE @pEmployeeId INT = 5958,
        @pEmployerId INT = 10,
        @viewType CHAR(1) = 'F', -- A or M or F
        @filterType CHAR(2) = NULL;

EXEC Sp_TnE_GetAllExpenseRequests @pEmployeeId, @pEmployerId, @viewType, @filterType

SET @pEmployeeId = 1432
SET @pEmployerId = 10
SET @viewType = 'A' -- A or M
SET @filterType = NULL

EXEC Sp_TnE_GetAllExpenseRequests @pEmployeeId, @pEmployerId, @viewType, @filterType

SELECT EmployeeId FROM [dbo].[FN_LocationBU_GetEmployeeDetails](1432,null) where employeeid = 1710