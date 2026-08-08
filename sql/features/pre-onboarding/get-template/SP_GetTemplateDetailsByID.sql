DECLARE @EmployerID INT = 10,
        @TemplateID INT = 33;

EXEC SP_GetTemplateDetailsByID @EmployerID, @TemplateID

SELECT * FROM POBLookupMaster 