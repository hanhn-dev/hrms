DECLARE @EmployeeIds NVARCHAR(MAX) = '1430',
        @Fields NVARCHAR(MAX) = '14'; --'4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24';
EXEC SP_GetEmpDetFields_Employees @EmployeeIds, @Fields

SELECT CountryOfBirth, BirthCountryName FROM TEmployee WHERE EmployeeId = 1430

-- DECLARE @EmployeeIds NVARCHAR(MAX) = '1430,1431',
--         @Fields NVARCHAR(MAX) = '28';
-- EXEC SP_GetEmpDetFields_Employees @EmployeeIds, @Fields

SELECT ID,NiceName Value,ISO Filter FROM dbo.TCountry
SELECT * FROM TEmployeeDetail_Section
SELECT * FROM TEmployeeDetail_Fields

SELECT * FROM TEmployeeDetail_Fields WHERE FieldName = 'PIT'

EXEC sp_help 'TEmployeeDetail_Fields'

SELECT * FROM TCustomFieldsMaster
SELECT * FROM TEmployeeCustomFields

SELECT * FROM TEmployeeDetail_Section
SELECT * FROM TEmployee
SELECT * FROM TEmployeeDetail_Upload

SELECT TOP 10 * FROM TEmployee

-- UPDATE TEmployeeDetail_Fields SET [Format] = 'dd-MMM-yyyy' WHERE FieldID IN (9, 12, 43, 46, 77, 80, 111, 114)

SELECT [TEmployeeDetail_Fields].[FieldID], [TEmployeeDetail_Fields].[FieldName], [TEmployeeDetail_Fields].[DisplayText], [TEmployeeDetail_Fields].[FieldEntity], [TEmployeeDetail_Fields].[Length], [TEmployeeDetail_Fields].[Format], [TEmployeeDetail_Fields].[IsMandatory], [TEmployeeDetail_Fields].[IsDefault], [TEmployeeDetail_Fields].[IsHidden], [Section].[SectionID] AS [Section.SectionID], [Section].[Section] AS [Section.SectionName]
FROM [dbo].[TEmployeeDetail_Fields] AS [TEmployeeDetail_Fields] INNER JOIN [dbo].[TEmployeeDetail_Section] AS [Section] ON [TEmployeeDetail_Fields].[SectionID] = [Section].[SectionID]
WHERE ([TEmployeeDetail_Fields].[IsActive] = 1 AND [TEmployeeDetail_Fields].[FieldEntity] IN (N'System') AND [TEmployeeDetail_Fields].[FieldEntity] IN (N'Segment') AND ([TEmployeeDetail_Fields].[SectionID] = N'1' AND [TEmployeeDetail_Fields].[CountryID] IN (0, N'99') AND [TEmployeeDetail_Fields].[EmployerId] IN (0, N'10')));