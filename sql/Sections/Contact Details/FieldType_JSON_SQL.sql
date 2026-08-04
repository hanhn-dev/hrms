---------- ID ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 2, FieldType_JSON_SQL = 'SELECT a.EmployeeId AS ID   ,CONCAT (    dbo.Fn_GetEmployeeName(a.EmployeeId)    ,''(''    ,b.EmploymentNumber    ,'')''    ) AS [Value]  FROM TEmployee a   ,TEmployeeInfo b   ,TEmployerDetails ED  WHERE a.EmployeeId = b.EmployeeId   AND b.EmployerID = ED.EmployerId   AND a.IsActive = ''Y''   AND a.Employerid = @EmployerId   AND A.EmployeeId IN (SELECT EmployeeId FROM dbo.FN_LocationBU_GetEmployeeDetails_Clone(@EmployeeId,@EmployerId))   AND ISNULL(A.CountryOfEmployment,0) = CASE WHEN ISNULL(@CountryId,0) = 0 THEN ISNULL(A.CountryOfEmployment,0) ELSE @CountryId END' WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- EmployeeContactDetailID ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'EmployeeContactDetailID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- Home Telephone ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'Home Telephone' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- Personal Email ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'Personal Email' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- Work Mobile Number ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'Work Mobile Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- Personal Mobile Number ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'Personal Mobile Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- Work Telephone ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'Work Telephone' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

---------- Extension Number ----------
UPDATE TEmployeeDetail_Fields SET IsHidden = 0, FieldTypeID = 4, FieldType_JSON_SQL = NULL WHERE FieldName = 'Extension Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')
