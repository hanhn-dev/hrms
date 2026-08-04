EXEC USP_GetMyDetailsFieldsConfig @EmployerId = 10

EXEC USP_GetMyDetailsFieldsConfig_History @EmployerId = 10, @POBLookupID = 1


DECLARE @lookupItems AS dbo.UDT_POBLookUp_FieldItems
INSERT INTO @lookupItems VALUES (10, 1, 1, 1)

DECLARE @effectiveFrom DATE = GETDATE()

EXEC USP_UpdateMyDetailsFieldsConfig @POBLookUpFields = @lookupItems, @EffectiveFrom = @effectiveFrom, @UpdatedBy = -1

SELECT * FROM POBLookupEmployerMapping WHERE EmployerID = 10
SELECT * FROM POBLookupItems WHERE EmployerId = 10
SELECT * FROM POBLookupMaster

SELECT * FROM POBLookupItems
