----- Employment Number -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 0 WHERE FieldName = 'Employment Number' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Employment Type ------
UPDATE TEmployeeDetail_Fields SET IsValidate = 1 WHERE FieldName = 'EmploymentType' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Effective Date -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"effectiveDate","errorMessage":"Effective date should be greater than Date of Joining."}]' WHERE FieldName = 'EffectiveDate' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Grade Band -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 0 WHERE FieldName = 'GradeBand' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Confirmation Due Date -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY","allowedNull":true,"allowedEmpty":true},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"confirmedDate","errorMessage":"Confirmed date should be greater than or equal to Date of Joining."}]' WHERE FieldName = 'ConfirmationDueDate' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Confirmation Date -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY","allowedNull":true,"allowedEmpty":true},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"confirmedDate","errorMessage":"Confirmed date should be greater than or equal to Date of Joining."}]' WHERE FieldName = 'ConfirmationDate' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Notice Period -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"range","params":{"min":0,"max":999999999},"errorMessage":"The Value must be in range of (0 - 999999999)."}]' WHERE FieldName = 'NoticePeriod' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Previous Experience(In Years and Month) -----
----- Previous Experience In Current Organization(In Years and Month) -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"numeric","errorMessage":"The value must be digit only."}]' WHERE FieldName IN ('PreviousExperienceYears'
,'PreviousExperienceMonths'
,'PreviousExperienceInCurrentOrganizationYears'
,'PreviousExperienceInCurrentOrganizationMonths') AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Previous Employment No In Current Organization -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"previousEmploymentNumber","errorMessage":"Please enter valid Previous Employement No in Current Organization."}]' WHERE FieldName = 'PreviousEmploymentNo' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- EndOfContractDate -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY","allowedNull":true,"allowedEmpty":true},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"contractEndDate","errorMessage":"Date of Joining should not be greater than End of Contract Date."}]' WHERE FieldName = 'EndOfContractDate' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Assessment Tenure -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"assessmentTenure","errorMessage":"Assessment Tenure must have a value."}]' WHERE FieldName = 'AssessmentTenure' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Upcoming Assessment -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"upcomingAssessment","errorMessage":"Upcoming Assessment must be January-December value if the Assessment Tenure is 12 Month Cycle. Or it must be a future date if the Assessment Tenure is Year Cycle."}]' WHERE FieldName = 'UpcomingAssessment' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Review Manager -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"reviewManager","errorMessage":"Reviewer is enabled for Employees organization. Please add Review Manager."}]' WHERE FieldName = 'ReviewManager' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- UAN -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"minLength":1,"maxLength":30,"allowedNull":true,"allowedEmpty":true},"errorMessage":"The Value can''t contain more than 30 characters."}]' WHERE FieldName = 'UANNumber' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- PF Number -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"minLength":1,"maxLength":30,"allowedNull":true,"allowedEmpty":true},"errorMessage":"The Value can''t contain more than 30 characters."}]' WHERE FieldName = 'PFNumber' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- ESIC -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"stringLength","params":{"minLength":1,"maxLength":17,"allowedNull":true,"allowedEmpty":true},"errorMessage":"The Value can''t contain more than 17 characters."}]' WHERE FieldName = 'ESIC' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Comments -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^\\w+[^<>]*$","allowedNull":true,"allowedEmpty":true},"errorMessage":"The comments need to follow the pattern ^\\w+[^<>]*$."},{"rule":"stringLength","params":{"minLength":0,"maxLength":500,"allowedNull":true,"allowedEmpty":true},"errorMessage":"The comment can''t contain more than 500 characters."}]' WHERE FieldName = 'Comments' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- IsAutoPresent -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 0 WHERE FieldName = 'IsAutoPresent' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- AutoPresentEffectiveFrom -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY","allowedNull":true,"allowedEmpty":true},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"autoPresentEffectiveFrom","errorMessage":"Auto Present Effective From is required when Is Auto Present is provided."}]' WHERE FieldName = 'AutoPresentEffectiveFrom' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Date of Joining (DOJ vs Auto Present Effective From) -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"notFutureDate","errorMessage":"Date of Joining cannot be greater than todays date."},{"rule":"dateOfJoiningVsAutoPresent","errorMessage":"Date of Joining cannot be later than Auto Present Effective From."}]' WHERE FieldName = 'DOJ' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')

----- Attendance Mode -----
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"attedanceMode","errorMessage":"Some attendance modes don''t exist in the system."}]' WHERE FieldName = 'AttendanceMode' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Current Employment Details')
