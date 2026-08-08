DECLARE @employeeId INT = NULL,
        @employerId INT = 10,
        @employeeName VARCHAR(100) = NULL,
        @type CHAR(1) = 'A', -- 'E' or 'M'
        @countryId INT = -1;

EXEC Sp_TnE_SearchEmployee @employeeId, @employerId, @employeeName, @type, @countryId