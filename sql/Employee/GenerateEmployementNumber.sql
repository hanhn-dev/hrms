DECLARE @EmploymentNumber NVARCHAR(20) = '',
        @EmployerID INT = 10,
        @EmploymentTypeID INT = 10;

DECLARE @EmploymentNumbers TABLE (EmploymentNumber NVARCHAR(20));

INSERT INTO @EmploymentNumbers EXEC USP_Generate_Employment_Number @EmploymentNumber, @EmployerID, @EmploymentTypeID

SET @EmploymentNumber = (SELECT TOP 1 EmploymentNumber FROM @EmploymentNumbers);

EXEC USP_Check_Availability @EmploymentNumber, @EmployerID
