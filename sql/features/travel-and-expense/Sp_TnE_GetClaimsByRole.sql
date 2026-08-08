DECLARE @roleId INT = 1,
        @employerId INT = 10,
        @searchType VARCHAR = 'R',
        @employeeId INT = 0;

EXEC Sp_TnE_GetClaimsByRole @roleId, @employerId, @searchType, @employeeId