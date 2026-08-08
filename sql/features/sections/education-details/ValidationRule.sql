---------- Type of Establishment -----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1 WHERE FieldName = 'Type of Establishment' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Address of Institute ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"minLength":0,"maxLength":299},"errorMessage":"The value can''t contain more than 299 characters."}]' WHERE FieldName = 'Address of Institute' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Reimbursement Date ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY", "allowedNull": true},"errorMessage":"The format is not DD-MMM-YYYY."}]' WHERE FieldName = 'Reimbursement Date' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Attended from -----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"compareTo","params":{"property":"AttendedTo","operator":"<","dataType":"date"},"errorMessage":"Attended from cannot be greater than or equal Attended to date."},{"rule":"notFutureDate","errorMessage":"Attended From cannot be greater than todays date."}]' WHERE FieldName = 'Attended from' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- AttendedTo ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"notFutureDate","errorMessage":"Attended To cannot be greater than todays date."}]' WHERE FieldName = 'AttendedTo' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Subject ---------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1 WHERE FieldName = 'Subject' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Division Monitoring Officer ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1 WHERE FieldName = 'Division Monitoring Officer' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Date of Graduation ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."}]' WHERE FieldName = 'Date of Graduation' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Currency ----------
UPDATE TEmployeeDetail_Fields SET DependOnField = (SELECT FieldID FROM TEmployeeDetail_Fields WHERE FieldName = 'Amount' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')) WHERE FieldName = 'Currency' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Company Sponsored ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dependentsOfCompanySponsor","errorMessage":"When Company Sponsored is Yes, Amount, Currency and Reimbursement Date must have values otherwise they have to be null."}]' WHERE FieldName = 'Company Sponsored' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Amount ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^\\d+(\\.\\d\\d)?$"},"errorMessage":"Please enter only numbers like 100 or 100.00"}]' WHERE FieldName = 'Amount' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Explain breaks during education -----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"minLength":0,"maxLength":299},"errorMessage":"The value can''t contain more than 299 characters."}]' WHERE FieldName = 'Explain breaks during education' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')
