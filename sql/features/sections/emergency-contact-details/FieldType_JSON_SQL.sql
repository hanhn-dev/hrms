---------- ID ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'SELECT a.EmployeeId AS ID 		,CONCAT ( 			dbo.Fn_GetEmployeeName(a.EmployeeId) 			,''('' 			,b.EmploymentNumber 			,'')'' 			) AS [Value] 	FROM TEmployee a 		,TEmployeeInfo b 		,TEmployerDetails ED 	WHERE a.EmployeeId = b.EmployeeId 		AND b.EmployerID = ED.EmployerId 		AND a.IsActive = ''Y''		AND a.Employerid = @EmployerId 		AND A.EmployeeId IN (SELECT EmployeeId FROM dbo.FN_LocationBU_GetEmployeeDetails_Clone(@EmployeeId,@EmployerId)) 		AND ISNULL(A.CountryOfEmployment,0) = CASE WHEN ISNULL(@CountryId,0) = 0 THEN ISNULL(A.CountryOfEmployment,0) ELSE @CountryId END' WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- EmergencyContactID ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 4 WHERE FieldName = 'EmergencyContactID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- Relation -----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'DECLARE @Relationships TABLE (      ID INT,      Relationship NVARCHAR(100),      UpdatedBy VARCHAR(100),      UpdatedDate DATETIME,      IsActive CHAR(1)  )    INSERT INTO @Relationships EXEC SP_EMPMD_GetEmergencyRelDet @EmployerId    SELECT ID, Relationship AS Value FROM @Relationships WHERE IsActive = ''Y''' WHERE FieldName = 'Relation' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

