
SELECT name, create_date, modify_date
FROM sys.objects
WHERE name = 'USP_TNE_FN_Get_CurrencyAmount'
ORDER BY modify_date DESC

SELECT *
FROM TRoles
WHERE RoleType = 'Adminstrator'
-- UPDATE TRoles SET RoleType = 'Administrator' WHERE RoleType = 'Adminstrator'

SELECT TOP 10
  *
FROM TEmployerDetails

EXEC sp_help 'TEmployerDetails'

SELECT *
FROM TRoles
WHERE Employerid = 10
SELECT TOP 10
  *
FROM TRolePagesMapping
SELECT TOP 100
  *
FROM TRoleManagement

DECLARE @Value VARBINARY(MAX) = 0x007D39E61ADD564D9266929F9CB1D83702000000BBA161AC2BDA14525E28911CB7279A3B1FBFA1624FBF3D9C9BFE974474FD570722A885E038DB5DCF258608C9220B3843

SELECT dbo.Fn_DecryptDataNew(@Value)

SELECT TOP 10
  *
FROM TDOCUMENTS

SELECT DocumentURI, COUNT(DocumentID)
FROM TDOCUMENTS
GROUP BY DocumentURI

SELECT TEDU.UploadID, EmployerID, CountryID, TEDU.DocumentID, TEDUS.Section_JSON, TEDU.CreatedBy, TEDU.CreateDate
FROM TEmployeeDetail_Upload AS TEDU
  INNER JOIN TDOCUMENTS AS TD ON TD.DocumentID = TEDU.DocumentID
  INNER JOIN TEmployeeDetail_Upload_Section AS TEDUS ON TEDUS.UploadID = TEDU.UploadID

SELECT TitleID,
      FName,
      LName,
      MiddleName,
      Gender,
      MaritalStatusID,
      DoB,
      WeddingDate,
      CountryOfBirth,
      StateofBirth,
      Nationality,
      BloodGroup_Encrypted,
      PostalZipCode,
      BirthZipCode,
      PermanentAddress,
      PermanentZipCode,
      EmailID
 FROM TEmployee WHERE EmployeeId = 1436

 SELECT Dbo.Fn_EncryptDataNew(N'AB-')

EXEC sp_help "TEmployee"

EXEC sp_helptext 'Sp_OpenEncryptionKeys'

SELECT * FROM TFieldType_LookUp
SELECT * FROM TEmployee
SELECT * FROM TEmployeeDetail_Fields

SELECT *
FROM TCountryWiseFieldName
WHERE CountryId = 99 AND (ExistingFieldName LIKE '%AADH%' OR ExistingFieldName LIKE '%PAN%')

SELECT * FROM TEmployeeDetail_Upload ORDER BY UploadID DESC
SELECT TOP 10 * FROM TEmployeeDetail_Upload WHERE Status = 'Processed' ORDER BY UploadID DESC

SELECT * FROM TEmployeeDetail_Upload WHERE UploadID = 795  -- WHERE UploadID = 792

SELECT * FROM TEmployeeDetail_Fields

UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = NULL WHERE FieldType_JSON_SQL = ''

sp_helptext 'SP_Set_TEmployeeDetail_Upload'

SELECT (SELECT TOP 1 EmployeeID FROM dbo.TEmployee WHERE EmployeeId = A.EmployeeID) AS [ID],(SELECT TOP 1 EmploymentNumber FROM dbo.TEmployeeInfo WHERE EmployeeId = A.EmployeeID) AS [Employment Number],(SELECT TOP 1 dbo.Fn_GetEmployeeName(EmployeeId) FROM dbo.TEmployeeInfo WHERE EmployeeId = A.EmployeeID) AS [Employee Name],dbo.Fn_DecryptData(Aadhar Number) AS [Aadhar Number],dbo.Fn_DecryptData(PAN Number) AS [PAN Number] FROM dbo.#IDs AS B  JOIN dbo.TEmployee AS A ON B.[Value] = A.EmployeeID
sp_help 'TEmployee'

SELECT * FROM TEmployeeDetail_Fields WHERE FieldID IN (73,74) OR DB_Column_Encrypted = 1

-- UPDATE TEmployeeDetail_Fields SET DB_Column = 'AadharNumber', FieldName = 'Aadhar Number', DB_Column_Encrypted = 0  WHERE FieldID = 73
-- UPDATE TEmployeeDetail_Fields SET DB_Column = 'TaxId', FieldName = 'PAN Number', DB_Column_Encrypted = 0  WHERE FieldID = 74


SELECT EmployeeId, BirthZipCode, AadharNumber, TaxId FROM TEmployee WHERE employeeId = 1436
--1430	E8ED0A594ABB	D0D920FFC2

SELECT BirthZipCode, * FROM TEmployee WHERE EmployeeId = 1436

UPDATE TEmployee SET BirthZipCode = '' WHERE EmployeeId = 1436

SELECT * FROM TEmployeeDetail_Upload WHERE CreatedBy != 1436 ORDER BY UploadID DESC

SELECT * FROM TEmployeeDetail_Upload WHERE CreatedBy = 1436 ORDER BY UploadID DESC
SELECT * FROM TEmployeeDetail_Upload_Section WHERE UploadSectionID = 754
SELECT * FROM TEmployeeDetail_Section WHERE SectionID = 1
SELECT * FROM TEmployeeDetail_Category
SELECT * FROM TEmployeeDetail_Section_Category

SELECT * FROM TEmployeeDetail_Fields WHERE FieldEntity = 'Segment'


-- SKILLS
SELECT * FROM TMSkills
SELECT * FROM TEmployeeSkillDetails
SELECT * FROM TEmployeeSkillHistoryDetails WHERE EMployeeID = 5956 ORder BY SkillDetailsHistoryId DESC

-- DOMAINS
SELECT * FROM TSkillDomainMaster
SELECT * FROM TEmployeeDomainDetails
SELECT * FROM TEmpDomainHistoryDetails

