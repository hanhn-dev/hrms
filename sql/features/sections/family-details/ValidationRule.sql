---------- Relationship ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = NULL WHERE FieldName = 'Relationship' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- ID ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = NULL WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Name ---------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^[a-zA-Z ]*$"},"errorMessage":"The value does not match the pattern [a-zA-Z ]*"}]' WHERE FieldName = 'Name' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Date of Birth ---------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"notFutureDate","errorMessage":"Date Of Birth should not be future date."}]' WHERE FieldName = 'Date of Birth' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Mediclaim Insurance through Company ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 0, ValidationRule = NULL WHERE FieldName = 'Mediclaim Insurance through Company' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Dependent (Yes/No) ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 0, ValidationRule = NULL WHERE FieldName = 'Dependent (Yes/No)' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Address ---------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"minLength":0,"maxLength":200,"allowedNull":true,"allowedEmpty":true},"errorMessage":"The value can''t contain more than 200 characters."}]' WHERE FieldName = 'Address' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Comments ---------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^\\w+[^<>]*$","allowedNull":true,"allowedEmpty":true},"errorMessage":"The value doesn''t match the pattern ^\\w+[^<>]*$."}]' WHERE FieldName = 'Comments' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- Unique Identification Number ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 0, ValidationRule = NULL WHERE FieldName = 'Unique Identification Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')

---------- EmployeeFamilyDetailID ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 0, ValidationRule = NULL WHERE FieldName = 'EmployeeFamilyDetailID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Family Details')