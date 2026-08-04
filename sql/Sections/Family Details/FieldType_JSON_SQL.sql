UPDATE TEmployeeDetail_Fields SET IsHidden = 0 WHERE SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- ID ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'SELECT a.EmployeeId AS ID 		,CONCAT ( 			dbo.Fn_GetEmployeeName(a.EmployeeId) 			,''('' 			,b.EmploymentNumber 			,'')'' 			) AS [Value] 	FROM TEmployee a 		,TEmployeeInfo b 		,TEmployerDetails ED 	WHERE a.EmployeeId = b.EmployeeId 		AND b.EmployerID = ED.EmployerId 		AND a.IsActive = ''Y''		AND a.Employerid = @EmployerId 		AND A.EmployeeId IN (SELECT EmployeeId FROM dbo.FN_LocationBU_GetEmployeeDetails_Clone(@EmployeeId,@EmployerId)) 		AND ISNULL(A.CountryOfEmployment,0) = CASE WHEN ISNULL(@CountryId,0) = 0 THEN ISNULL(A.CountryOfEmployment,0) ELSE @CountryId END' WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Relationship ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'DECLARE @Relationships TABLE (      ID INT,      Relationship NVARCHAR(100),      UpdatedBy INT,      UpdatedDate DATETIME,      IsActive CHAR(1)  )    INSERT INTO @Relationships EXEC SP_EMPMD_GetEmergencyRelDet @EmployerId    SELECT ID, Relationship AS Value FROM @Relationships WHERE IsActive = ''Y''' WHERE FieldName = 'Relationship' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Mediclaim Insurance through Company ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = '[{"ID":true,"Value":"Yes","Filter":true},{"ID":false,"Value":"No","Filter":false}]' WHERE FieldName = 'Mediclaim Insurance through Company' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Minor ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = '[{"ID":true,"Value":"Yes","Filter":true},{"ID":false,"Value":"No","Filter":false}]' WHERE FieldName = 'Minor' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Dependent (Yes/No) ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = '[{"ID":true,"Value":"Yes","Filter":true},{"ID":false,"Value":"No","Filter":false}]' WHERE FieldName = 'Dependent (Yes/No)' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Date of Birth ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 3, [Format] = 'DD-MMM-YYYY' WHERE FieldName = 'Date of Birth' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Name ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 4 WHERE FieldName = 'Name' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- EmployeeFamilyDetailID ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 4 WHERE FieldName = 'EmployeeFamilyDetailID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Address ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 4 WHERE FieldName = 'Address' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Comments ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 4 WHERE FieldName = 'Comments' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Unique Identification Number ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 4 WHERE FieldName = 'Unique Identification Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')