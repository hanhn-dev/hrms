DECLARE @EmployerId INT = 10,
        @EmployeeId INT = 1710;


SELECT * FROM tAdvances_AdvanceRequestStatus

EXEC SP_Advances_GetAdvanceRequest_LimitAmount @EmployerId, @EmployeeId

-- EXEC OV_ModuleMasterList @EmployerId
EXEC SP_Advances_GetAdvanceTypeDetails @EmployerId
EXEC SP_Advances_GetAdvanceType_Limit @EmployerId
EXEC SP_GetAdvanceTypeList @EmployerId
EXEC SP_GetAllGradeAndDesignationList @EmployerId, 'G'
EXEC SP_GetAllGradeAndDesignationList @EmployerId, 'D'

SELECT * FROM tAdvanceTypeDetails
SELECT * FROM tAdvanceType_Limit WHERE AdvanceTypeLimitId = 26

SP_Advances_GetEmployeeListCTC

