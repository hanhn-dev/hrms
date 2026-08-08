----------- ID ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = NULL WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

----------- Extension Number
UPDATE TEmployeeDetail_Fields SET IsValidate = 0, ValidationRule = NULL WHERE FieldName = 'Extension Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

----------- Home Telephone ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."}, {"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'Home Telephone' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

----------- Work Mobile Number ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."}, {"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'Work Mobile Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

----------- Personal Mobile Number ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."}, {"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'Personal Mobile Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

----------- Work Telephone ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"phonePattern","params":{"allowedNull":true},"errorMessage":"The value doesn''t match the phone pattern."}, {"rule":"phoneCode","params":{"allowedNull":true},"errorMessage":"The phone code doesn''t exist."}]' WHERE FieldName = 'Work Telephone' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')

----------- Personal Email ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"email","errorMessage":"The value is not in email format."}]' WHERE FieldName = 'Personal Email' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Contact Details')