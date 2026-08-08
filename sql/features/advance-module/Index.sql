DECLARE @EmployerId INT = 10
EXEC SP_Advances_GetEmployeeListCTC @EmployerId
EXEC SP_GetAllGradeAndDesignationList @EmployerId, 'G'

-- EXEC OV_ModuleMasterList @EmployerId
EXEC SP_Advances_GetAdvanceTypeDetails @EmployerId
EXEC SP_Advances_GetAdvanceType_Limit @EmployerId
EXEC SP_GetAdvanceTypeList @EmployerId
EXEC SP_GetAllGradeAndDesignationList @EmployerId, 'G'
EXEC SP_GetAllGradeAndDesignationList @EmployerId, 'D'

SELECT * FROM tAdvanceTypeDetails
SELECT * FROM tAdvanceType_Limit

-- UPDATE tAdvanceType_Limit SET SetLimitBasedOn = 'G'


SELECT * FROM tAdvances_AdvanceRequestByEmployee
EXEC sp_help 'tAdvances_AdvanceRequestByEmployee'

SELECT * FROM tAdvances_AdvanceRequestStatus
