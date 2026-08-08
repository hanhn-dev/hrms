DECLARE @UserId INT = 1430, -- 1710
        @EmployerId INT = 10;

EXEC sp_GetDynamicMenuItems @UserId, @EmployerId
