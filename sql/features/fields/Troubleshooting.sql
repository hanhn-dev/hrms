-- DECLARE @EmployeeIds VARCHAR = N'1430',
--         @FieldIds VARCHAR = N'9,12,152,153,154,155,156,157,158,159'
-- EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields @EmployeeIds, @FieldIDs
-- EXEC SP_BulkUpdateProfile_Process_Template 1080, 1436

SELECT TOP 100 * FROM TEmployeeDetail_Upload_Section WHERE UploadID = 81

SELECT TEF.FieldID, TEF.ValidationRule, TEF.FieldType_JSON_SQL, TEF.IsValidate, TEF.IsMandatory, TEF.IsHidden, TEF.FieldTypeID, TEF.FieldName, TEF.DisplayText, TEF.IsActive
, TEF.DB_Table, TEF.DB_Column
FROM TEmployeeDetail_Fields AS TEF
    INNER JOIN TEmployeeDetail_Section AS S ON S.SectionID = TEF.SectionID
WHERE S.Section IN ('Family Details')

---------- LATEST UPLOAD --------
SELECT TUS.*
FROM TEmployeeDetail_Upload_Section AS TUS
    INNER JOIN TEmployeeDetail_Upload AS TU ON TUS.UploadID = TU.UploadID
WHERE TUS.UploadID = (SELECT MAX(UploadID)
FROM TEmployeeDetail_Upload
WHERE CreatedBy = 1436)

SELECT TEF.FieldID, TEF.FieldName,
TEF.DisplayText, TEF.FieldEntity, TEF.DB_IsIdentity, TEF.DependOnField, TEF.DisplayOrder,
TEF.IsMandatory, TEF.DB_Table, TEF.DB_Column, TEF.FieldTypeID, TEF.FieldType_JSON_SQL,
TEF.Format, TEF.Length, TEF.IsValidate, TEF.ValidationRule
FROM TEmployeeDetail_Fields AS TEF
    INNER JOIN TEmployeeDetail_Section AS S ON S.SectionID = TEF.SectionID
WHERE S.SectionID IN (8)

SELECT TRT.*, TR.RoleName FROM TRoleTabDetails  TRT
INNER JOIN TRoles TR ON TRT.RoleId = TR.RoleID
WHERE TRT.Employerid = 10 AND MenuId = 1168 
SELECT * FROM TTabDetails WHERE MenuId = 1168
SELECT TOP 100* FROM TUserTabDetails WHERE UserId = 1434

EXEC Sp_GetTabUserDetails 10, 1434
EXEC sp_GetDynamicMenuItems 1436, 10

----- Nomination Details -----
EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1852,4885,4886', N'126,127,128,129,130,131,132'
----- Family Details -----
EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1852,4885,4886', N'152,153,154,155,156,157,158,159,160,161,162'
----- Skill Details -----
EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1852,4885,4886', N'70,72,73,74,75,76'
----- Certification Details -----
EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1852,4885,4886', N'181,182,183,184,185,186,187,188,189,190'
