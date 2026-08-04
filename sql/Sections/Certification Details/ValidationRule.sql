---------- Certificate/Exam ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, IsMandatory = 1 WHERE FieldName = 'Certificate/Exam' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Certified On ----------
UPDATE TEmployeeDetail_Fields SET [Format] = 'DD-MMM-YYYY', IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"notFutureDate","errorMessage":"Certified On cannot be greater than todays date."},{"rule":"compareTo","params":{"property":"Expiry/Renewal Date","operator":"<","dataType":"date"},"errorMessage":"Certified On cannot be same as or greater than Expiry/Renewal Date."}]' WHERE FieldName = 'Certified On' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Expiry/Renewal Date ----------
UPDATE TEmployeeDetail_Fields SET [Format] = 'DD-MMM-YYYY', IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"compareTo","params":{"property":"Certified On","operator":">","dataType":"date"},"errorMessage":"Expiry/Renewal Date can''t be less than or equal to Certified On."}]' WHERE FieldName = 'Expiry/Renewal Date' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Percentage ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"range","params":{"min":0,"max":100,"allowedNull":true,"allowedEmpty":true},"errorMessage":"Please enter valid Percentage."}]' WHERE FieldName = 'Percentage' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Skill -----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, IsMandatory = 1 WHERE FieldName = 'Skill' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Renewed On ----------
UPDATE TEmployeeDetail_Fields SET [Format] = 'DD-MMM-YYYY', IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY","allowedNull":true,"allowedEmpty":true},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"compareTo","params":{"property":"Expiry/Renewal Date","operator":">=","dataType":"date","allowedNull":true,"allowedEmpty":true},"errorMessage":"Renewed On Date can''t be less than Expiry/Renewal Date."}]' WHERE FieldName = 'Renewed On' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Institution ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"maxLength":100,"allowedNull":true,"allowedEmpty":true},"errorMessage":"Institution can''t have more than 100 characters."}]' WHERE FieldName = 'Institution' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Reference # ----------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"maxLength":50},"errorMessage":"Reference # can''t have more than 50 characters."}]' WHERE FieldName = 'Reference #' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')


