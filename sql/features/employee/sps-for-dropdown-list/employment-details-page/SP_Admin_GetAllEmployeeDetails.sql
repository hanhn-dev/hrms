DECLARE @EmployerId INT = 10,
        @CandidateId INT = NULL,
        @EmployeeId INT = 1431;

EXEC SP_Admin_GetAllEmployeeDetails @EmployerId, @CandidateId, @EmployeeId;
-- sp_helptext SP_Admin_GetAllEmployeeDetails