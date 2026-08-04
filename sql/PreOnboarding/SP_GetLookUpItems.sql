DECLARE @EmployerID INT = 10
/** Get Sections **/
EXEC USP_GetMyDetailsFieldsConfig @EmployerID
/** Get Fields **/
EXEC SP_GetLookUpItems @EmployerID = @EmployerID , @CountryID = 99

-- EXEC SP_GetLookUpItems_MyDetails

SELECT * FROM POBLookupItems WHERE POBLookupItemsID = 11
SELECT * FROM POBLookupEmployerMapping WHERE POBLookupItemsID = 13 AND POBLookupID = 1 AND EmployerID = 10

-- UPDATE POBLookupEmployerMapping SET IsHide = 1 WHERE POBLookupItemsID = 13 AND POBLookupID = 1 AND EmployerID = 10

-- UPDATE POBLookupItems SET IsDefault = 0 WHERE POBLookupItemsID = 11
-- UPDATE POBLookupItems SET IsDefault = 0 WHERE POBLookupItemsID = 12
-- UPDATE POBLookupItems SET IsDefault = 0 WHERE POBLookupItemsID = 13