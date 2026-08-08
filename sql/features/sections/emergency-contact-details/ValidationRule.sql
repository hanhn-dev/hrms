---------- ID ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, IsMandatory = 1 WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- EmergencyContactName ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, IsMandatory = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^[a-zA-Z,''-'''' ''\\.0-9\\n]+$"},"errorMessage":"The value does not match the pattern ^[a-zA-Z,''-'''' ''\\.0-9\\n]+$"}]' WHERE FieldName = 'EmergencyContactName' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- Relation -----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = NULL, IsMandatory = 1 WHERE FieldName = 'Relation' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- EmergencyContactAddress ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 0 WHERE FieldName = 'EmergencyContactAddress' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- ContactWorkPhone ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."},{"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'ContactWorkPhone' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- ContactHomePhone ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."},{"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'ContactHomePhone' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- EmergencyMobile -----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."},{"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'EmergencyMobile' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')

---------- ContactZipCode ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^\\d{5,6}$","allowedNull":true,"allowedEmpty":true},"errorMessage":"Your zip code should contain 5 or 6 digits only."}]' WHERE FieldName = 'ContactZipCode' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Emergency Contact Details')