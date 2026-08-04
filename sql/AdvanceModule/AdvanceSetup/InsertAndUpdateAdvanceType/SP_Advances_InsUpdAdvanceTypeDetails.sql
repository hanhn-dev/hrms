DECLARE @EmployerId INT = 10,
        @AdvanceType VARCHAR(100) = 'Food',
        @IsActive BIT = 1,
        @CreatedBy INT = 1710,
        @AdvanceTypeId INT = 11;

EXEC SP_Advances_InsUpdAdvanceTypeDetails @EmployerId, @AdvanceType, @IsActive, @CreatedBy, @AdvanceTypeId

SELECT * FROM tAdvanceTypeDetails WHERE AdvanceTypeId = 11;

UPDATE tAdvanceTypeDetails SET IsActive = 1 WHERE AdvanceTypeId = 1031;