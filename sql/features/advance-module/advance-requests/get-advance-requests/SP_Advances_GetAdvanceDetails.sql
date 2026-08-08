DECLARE @EmployerId INT = 10,
        @EmployeeId INT = 1436,
        @AdvanceRequestDetailId INT = 24,
        @RequestType VARCHAR(6) = 'Notify'; -- Self | Team | All | Notify

EXEC SP_Advances_GetAdvanceDetails @EmployeeId, @EmployerId, NULL, @RequestType
-- EXEC SP_Advances_GetAdvanceDetails @EmployeeId, @EmployerId, @AdvanceRequestDetailId, NULL

-- SELECT * FROM tAdvances_AdvanceRequestByEmployee WHERE AdvanceRequestDetailId = @AdvanceRequestDetailId
-- SELECT * FROM tAdvances_AdvanceByEmployeeDetails WHERE AdvanceRequestDetailId = @AdvanceRequestDetailId
-- SELECT * FROM tAdvances_AdvanceDocuments WHERE AdvanceRequestDetailId = @AdvanceRequestDetailId
-- 1033
SELECT * FROM tAdvances_AdvanceByEmployeeDetails
SELECT TOP 10 * FROM TDocuments ORDER BY CreatedOn DESC
SELECT * FROM tAdvanceType_Limit where AdvanceTypeLimitId = 1033
SELECT * FROM tAdvanceTypeDetails WHERE AdvanceTypeId = 5

SELECT * FROM tMenuDetails WHERE MenuId = 1157

