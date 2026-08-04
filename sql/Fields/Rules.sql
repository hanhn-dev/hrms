-- FirstName / LastName Rules.
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"pattern","params":{"pattern":"^[a-zA-Z]+$"},"errorMessage":"Only varchars are allowed."}]' WHERE FieldName IN ('First Name', 'Last Name')
-- MiddleName Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^[a-zA-Z ]*$", "allowedNull": true},"errorMessage":"Only varchars are allowed."}]' WHERE FieldName = 'Middle Name'
-- Title Rules.
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"existInDatabase","params":{"table":"TPersonalTitle","column":"ID"},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'Title'
-- Gender Rules.
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"existInDatabase","params":{"table":"TGender","column":"ID"},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'Gender'
-- Date of Birth Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."},{"rule":"age","params":{"format":"DD-MMM-YYYY"},"errorMessage":"Age must be greater than 18."}]' WHERE FieldName = 'Date of Birth (DD-MMM-YYYY)'
-- Marital Status Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"existInDatabase","params":{"table":"TMaritalStatus","column":"ID","allowedNull":true},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'Marital Status'
-- Wedding Date Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY","allowedNull":true},"errorMessage":"The format is not DD-MMM-YYYY."}]' WHERE FieldName = 'Wedding Date (DD-MMM-YYYY)'
-- Zip Code of Birth Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^\\d{5,6}$","allowedNull":true,"allowedEmpty":true},"errorMessage":"Your zip code should contain 5 or 6 digits only."}]' WHERE FieldName = 'Zip Code of Birth'
-- Country of Birth Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"existInDatabase","params":{"table":"TCountry","column":"NICENAME"},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'Country of Birth'
-- State Of Birth Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"existInDatabase","params":{"table":"TCountryStates","column":"StateCode","allowedNull":true},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'State of Birth'
-- City Of Birth Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^[a-zA-Z ]*$", "allowedNull": true},"errorMessage":"Only varchars are allowed."}]' WHERE FieldName = 'City of Birth'
-- Nationality Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"existInDatabase","params":{"table":"TCountry","column":"NATIONALITY"},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'Nationality'
-- Current Address / Permanent Address Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."}]' WHERE FieldName IN ('Current Address', 'Permanent Address')
-- Current Zip Code / Permanent Zip Code Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^\\d{5,6}$","allowedNull":true,"allowedEmpty":true},"errorMessage":"Your zip code should contain 5 or 6 digits only."}]' WHERE FieldName IN ('Current Zip Code', 'Permanent Zip Code')
-- State Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"existInDatabase","params":{"table":"TCountryStates","column":"StateID","allowedNull":true},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'State'
-- Email Rules
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"email","errorMessage":"The value is not in email format."}]' WHERE FieldName = 'Work Email'

------------------ SKILL SECTION ---------------------
-- Skill Name
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"existInDatabase","params":{"table":"TMSkills","column":"SkillID","allowedNull":true},"errorMessage":"The value doesn''t exist in the database."}]' WHERE FieldName = 'Skill Name'
-- Self Rate
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"range","params": {"min": 0, "max": 10},"errorMessage":"The value is not a valid rate."}]' WHERE FieldName = 'Self Rating(0 to 10)'
-- Years/Months
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"required","errorMessage":"This field can''t be empty."},{"rule":"numeric","errorMessage":"The value is not a valid number."}]' WHERE FieldName IN ('Years', 'Month')



----------------- PASSPORT SECTION ------------------
-- Passport Name / Passport Number / Place of Issue
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"pattern","params":{"pattern":"^[a-zA-Z0-9 ]*$"},"errorMessage":"The value doesn''t match the pattern [a-zA-Z0-9 ]*"}]' WHERE FieldID IN (92, 93, 96) 
-- Expiry / Issue Date
UPDATE TEmployeeDetail_Fields SET IsValidate = 1, ValidationRule = '[{"rule":"dateFormat","params":{"format":"DD-MMM-YYYY"},"errorMessage":"The format is not DD-MMM-YYYY."}]' WHERE FieldID IN (94, 97)