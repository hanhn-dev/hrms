DECLARE @EmploymentNumber VARCHAR(200) = 'MDAwMDI=',
        @Email VARCHAR(200) = NULL,
        @CustomerNumber VARCHAR(10) = 'C00010',
        @UserType CHAR(1) = 'E';

EXEC SP_LOG_UserEmployee @EmploymentNumber, @Email, @CustomerNumber, @UserType
