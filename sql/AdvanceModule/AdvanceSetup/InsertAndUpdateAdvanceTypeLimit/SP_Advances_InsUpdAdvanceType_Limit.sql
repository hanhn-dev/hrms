DECLARE @EmployerId INT = 10,
        @AdvanceTypeLimitId INT = NULL, -- NULL to be inserted
        @AdvanceTypeId INT = 1,
        @SetLimitBasedOn CHAR(1) = 'G',
        @GradeIds VARCHAR(500) = '25',
        @DesignationIds VARCHAR(500) = '',
        @LimitCriteria CHAR(10) = 'CTC', -- F or CTC
        @CurrencyId INT = 99,
        @MaxLimit DECIMAL(9, 2) = 15,
        @CreatedBy INT = 1710;

EXEC SP_Advances_InsUpdAdvanceType_Limit 
        @AdvanceTypeLimitId,
        @AdvanceTypeId,
        @EmployerId,
        @SetLimitBasedOn,
        @GradeIds,
        @DesignationIds,
        @LimitCriteria,
        @MaxLimit,
        @CurrencyId,
        @CreatedBy

SELECT * FROM tAdvanceType_Limit WHERE AdvanceTypeLimitId = @AdvanceTypeLimitId

EXEC sp_help 'tAdvanceType_Limit'
