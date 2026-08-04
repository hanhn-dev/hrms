sp_help Sp_Mydetails_Enhanced_Advancedfilerdropdown

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Filter%'

SELECT TOP 100 * FROM Mydetails_Enhanced_Advancedfilters

sp_help Mydetails_Enhanced_Advancedfilters

EXEC SP_Mydetails_Enhanced_Getfamilyfornomination 1431

EXEC USP_GET_tAttendanceCaptureMode 10

SELECT * FROM TEmployeeInfo WHERE EmploymentNumber = '45454';

EXEC Sp_Mydetails_Enhanced_Getfilters 10, 3416

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Family%'

SELECT TOP 100 * FROM TEmployeeFamilyDetails

SELECT TOP 100 * FROM TEmployeeDetail_Fields WHERE EmployerId = 10 AND SectionID IN (14)
EXEC SP_GetCustomerSettings 'C00010'

Select FilterId,EmployerId,FilterName,FilterData,Ispublic from Mydetails_Enhanced_Advancedfilers WHERE Employerid=@Employerid AND Isdeleted=0 




sp_helptext Sp_CM_Mydetails_DirectIndirectReports

EXEC SP_BulkProfileUpdate_EmployeeListByFilters 19215, 10, 99, '', '', ''

SELECT TOP 100 * FROM TEmployeeInfo WHEre EmploymentNumber = '000786'

SELECT FieldType_JSON_SQL, FieldName, DisplayText, * FROM TEmployeeDetail_Fields WHERE EmployerId = 10 AND SectionID IN (1)

SELECT TCS.StateCode AS ID, TCS.StateName AS Value, TC.NICENAME AS [Filter] FROM TCountryStates AS TCS INNER JOIN TCOUNTRY AS TC ON TCS.CountryCode = TC.COUNTRYCODE ORDER BY ID


sp_helptext 'Sp_Mydetails_Enhanced_Advancedfilerdropdown'

SELECT TOP 100 * FROM TEmployeeBankDetails WHERE BankDetailId IS NOT NULL

SELECT TOP 100 * FROM TEmployeeNomination

SELECT TOP 100 * FROM TEmployeeDetail_Section

SELECT TOP 100 * FROM TEmployeePictures WHERE EmployeeID = 1431

SELECT TOP 100 * FROM TUserTabDetails

SELECT TOP 100 EmpImage, * FROM TEmployee WHERE EmployeeId = 1431

SELECT ValidationRule, IsValidate, DisplayText, * FROM TEmployeeDetail_Fields WHERE EmployerId = 10 AND SectionID IN (7)

EXEC SP_CM_GetWorkflowTreeXmlDetailsByPageTitle 'EmploymentTypeChange', 10, 1434

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Employment%'

EXEC USP_GENERATE_EMPLOYMENTNUMBERS_MANUAL 340
EXEC [USP_BulkGenerate_WorkEmail_Employment_Number] 89, 'aaaaa@test.com'
EXEC Usp_BulkCreate_EmploymentNumber_Validation N'[{"WorkEmail":"aaaaa@test.com","EmploymentNumber":"4"}]'
EXEC Usp_BulkCreate_Bulk_Validation N'[{"WorkEmail":"aaaaa@test.com","EmploymentNumber":"4"}]'

sp_helptext Usp_Mydetails_Enhanced_Process_Template

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%TEmployeeDetail_Upload_Creation_Finalizing%'

SELECT TOP 100 * FROM TEmployeeFamilyDetails



select * from TEmployeeDetail_Staging_Employee_Creation
SELECT TOP 100 * FROM TCustomerSettings WHERE EmployerId = 10

SELECT TOP 100 * FROM TEmployeeInfo WHERE EmploymentNumber = '8756434588'

SELECT TOP 100 * FROM TEmployeeDetail_Upload WHERE UploadID = 365

SELECT EmploymentNumber, * FROM TEmployeeInfo WHERE EmploymentNumber = '8756434613'

EXEC USP_GENERATE_EMPLOYMENTNUMBERS_MANUAL N'378'

sp_helptext Usp_Mydetails_Enhanced_UpdateProfilePicture

sp_helptext 'USP_GENERATE_EMPLOYMENTNUMBERS_MANUAL'
sp_helptext 'USP_BulkGenerate_WorkEmail_Employment_Number'
sp_helptext 'UFN_BulkCreate_Generate_EmploymentNumber'

SELECT
TOP 10 
  TPR.Result,
 TUS.UploadID,
 TUS.UploadSectionID,
 TUS.Total,
 TUS.Valid,
 TUS.InValid,
 TUS.Processed,
 TUS.UnProcessed,
 TUS.Fields,
 TUS.Section_JSON,
 TPR.UploadSectionID AS TPR_UploadSectionID,
 TPR.EmployeeData
FROM TEmployeeDetail_Upload_Section AS TUS
INNER JOIN TEmployeeDetail_Upload AS TEU ON TUS.UploadID = TEU.UploadID
LEFT JOIN TProcessedBatchResult AS TPR ON TUS.UploadSectionID = TPR.UploadSectionID
WHERE TEU.UploadType = 'BulkCreation'
--AND TUS.UploadID = 270
ORDER BY TUS.UploadSectionID DESC

  SELECT COUNT(*) FROM TEmployeeDetail_Upload_Section TEUS
  INNER JOIN TEmployeeDetail_Upload AS TEU ON TEUS.UploadID = TEU.UploadID
  LEFT JOIN TProcessedBatchResult AS TPBR ON TEUS.UploadSectionID = TPBR.UploadSectionID
  LEFT JOIN TEmployeeDetail_Upload_Creation_Finalizing AS TEUCF ON TEU.UploadID = TEUCF.UploadID
  WHERE TEU.UploadType = 'BulkCreation' AND TEU.[Status] = 'Processed' AND ISJSON(TPBR.Result) = 1 AND JSON_PATH_EXISTS(TPBR.Result, '$[0].Processed[0]."Employment Number"') = 0
  AND TEUCF.UploadID IS NULL


  SELECT [TEmployeeDetail_Upload].[UploadID], [Document].[DocumentID], [Document].[FileName], [Creator].[EmployeeId], [Creator].[FName], [Creator].[LName], [Updator].[EmployeeId], [Updator].[FName], [Updator].[LName], [Validator].[EmployeeId], [Validator].[FName], [Validator].[LName], [Processor].[EmployeeId], [Processor].[FName], [Processor].[LName], [TEmployeeDetail_Upload].[ValidatedOn], [TEmployeeDetail_Upload].[ProcessedOn], [TEmployeeDetail_Upload].[CreateDate], [TEmployeeDetail_Upload].[Status], [TEmployeeDetail_Upload].[IsShowData], [TEmployeeDetail_Upload].[UploadType], SUM([Sections].[Total]) AS [Total], SUM([Sections].[Valid]) AS [Valid], SUM([Sections].[Invalid]) AS [Invalid], SUM([Sections].[Processed]) AS [Processed], SUM([Sections].[UnProcessed]) AS [UnProcessed], CAST((SELECT COUNT(*) FROM TEmployeeDetail_Section
          WHERE SectionID IN (SELECT SectionID FROM TEmployeeDetail_Upload_Section WHERE UploadID = TEmployeeDetail_Upload.UploadID)
           AND Section = N'Current Employment Details') AS BIT) AS [IncludingEmploymentDetails], CAST((SELECT COUNT(*) FROM TEmployeeDetail_Upload_Section TEUS  
        INNER JOIN TEmployeeDetail_Upload AS TEU ON TEUS.UploadID = TEU.UploadID AND TEmployeeDetail_Upload.UploadID = TEUS.UploadID
        LEFT JOIN TProcessedBatchResult AS TPBR ON TEUS.UploadSectionID = TPBR.UploadSectionID
        WHERE TEU.UploadType = 'BulkCreation' AND TEU.[Status] = 'Processed' AND ISJSON(TPBR.Result) = 1 AND JSON_PATH_EXISTS(TPBR.Result, '$[0].Processed[0]."Employment Number"') = 0) AS BIT) AS [CanFinalize], [Document].[DocumentID] AS [Document.DocumentID], [Document].[FileName] AS [Document.FileName], [Creator].[EmployeeId] AS [Creator.EmployeeId], [Creator].[FName] AS [Creator.FirstName], [Creator].[LName] AS [Creator.LastName], [Updator].[EmployeeId] AS [Updator.EmployeeId], [Updator].[FName] AS [Updator.FirstName], [Updator].[LName] AS [Updator.LastName], [Validator].[EmployeeId] AS [Validator.EmployeeId], [Validator].[FName] AS [Validator.FirstName], [Validator].[LName] AS [Validator.LastName], [Processor].[EmployeeId] AS [Processor.EmployeeId], [Processor].[FName] AS [Processor.FirstName], [Processor].[LName] AS [Processor.LastName] FROM [dbo].[TEmployeeDetail_Upload] AS [TEmployeeDetail_Upload] INNER JOIN [dbo].[TDOCUMENTS] AS [Document] ON [TEmployeeDetail_Upload].[DocumentID] = [Document].[DocumentID] LEFT OUTER JOIN [dbo].[TEmployeeDetail_Upload_Section] AS [Sections] ON [TEmployeeDetail_Upload].[UploadID] = [Sections].[UploadID] LEFT OUTER JOIN [dbo].[TEmployee] AS [Creator] ON [TEmployeeDetail_Upload].[CreatedBy] = [Creator].[EmployeeId] LEFT OUTER JOIN [dbo].[TEmployee] AS [Updator] ON [TEmployeeDetail_Upload].[UpdatedBy] = [Updator].[EmployeeId] LEFT OUTER JOIN [dbo].[TEmployee] AS [Validator] ON [TEmployeeDetail_Upload].[ValidatedBy] = [Validator].[EmployeeId] LEFT OUTER JOIN [dbo].[TEmployee] AS [Processor] ON [TEmployeeDetail_Upload].[ProcessedBy] = [Processor].[EmployeeId] WHERE [TEmployeeDetail_Upload].[EmployerID] = N'10' AND [TEmployeeDetail_Upload].[uploadType] = N'BulkCreation' GROUP BY [TEmployeeDetail_Upload].[UploadID], [Document].[DocumentID], [Document].[FileName], [Creator].[EmployeeId], [Creator].[FName], [Creator].[LName], [Updator].[EmployeeId], [Updator].[FName], [Updator].[LName], [Validator].[EmployeeId], [Validator].[FName], [Validator].[LName], [Processor].[EmployeeId], [Processor].[FName], [Processor].[LName], [ValidatedOn], [ProcessedOn], [TEmployeeDetail_Upload].[CreateDate], [TEmployeeDetail_Upload].[Status], [IsShowData], [UploadType] ORDER BY [TEmployeeDetail_Upload].[UploadID] DESC;

SELECT * FROM TProcessedBatchResult ORDER BY UploadSectionID DESC


SELECT TOP 10 * FROM TEmployeeDetail_Upload_Section ORDER BY UploadSectionID DESC
SELECT TOP 10 Status, UploadType, * FROM TEmployeeDetail_Upload ORDER BY UploadID DESC

SELECT TOP 100 * FROM TCustomerSettings WHERE EmployerId = 10

SELECT TOP 100 * FROM TMEmploymentTypes WHERE EmployerId = 10

SELECT ValidationRule, * FROM TEmployeeDetail_Fields WHERE EmployerId = 10 AND DisplayText LIKE '%Designation%'

SELECT TOP 10 Section_JSON, TEU.[Status], * FROM TEmployeeDetail_Upload_Section AS TUS
INNER JOIN TEmployeeDetail_Upload AS TEU ON TUS.UploadID = TEU.UploadID
WHERE TEU.UploadType = 'BulkProfileUpdate' ORDER BY TUS.UploadSectionID DESC

SELECT * FROM TEmployee WHERE EmployeeID = 24538
SELECT * FROM TEmployeeInfo WHERE EmployeeID = 24538
 
SELECT TOP 10 * FROM TEmployeeDetail_Upload_Creation_Finalizing ORDER BY UploadID DESC

EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1431', N'1833,1834,1836,1837,1835'
EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1431', N'1833,1834,1836,1837,1835'

SELECT TOP 10 * FROM TEmployeePictures WHERE EmployeePicture is NOT NULl

SELECT EmployeeID, EmpImage	FROM TEmployee WHERE EmpImage IS NOT NULL

SELECT OBJECT_NAME(id) As Procedure_Name,S.text As Procedure_Text
FROM SYSCOMMENTS S
INNER JOIN SYS.OBJECTS O ON O.Object_Id = S.id
WHERE S.TEXT LIKE '%TEmployeePictures%'
AND O.type = 'P'

sp_helptext 'SP_Bulkcreation_Getallfields'

select * from TEmployee WHERE EmployeeID = 1431
select * from TEmployeeInfo WHERE EmployeeID = 1431
select custid, * From TEmployerDetails WHERE EmployerID = 10

select ProcessedResult, * from TEmployeeDetail_Upload WHERE UploadType = 'BulkProfileUpdate';
select * FROM TProcessedBatchResult WHERE UploadID = 856 ORDER BY ProcessedBatchResultID DESC
SELECT TOP 100 * FROM TEmployeeDetail_upload Where UploadID = 856
  SELECT TOP 10 * FROM TEmployeeDetail_Upload_Section ORDER BY UploadSectionID DESC
UPDATE TEmployeeDetail_Upload SET [Status] = 'Processed' WHERE UploadID = 892
--  DELETE FROM TProcessedBatchResult WHERE UploadID = 847 AND ProcessedBatchResultID <> 1113
-- SP_EMPMD_ISContractEndDateRequired 147, 25

EXEC Usp_Mydetails_Publicfields 1431

EXEC Usp_Mydetails_getdynamic_publicfields 10, 99

SELECT * FROM TEmployeeDetail_Section

SELECT FieldType_JSON_SQL, ValidationRule, FieldName, DisplayText FROM TEmployeeDetail_Fields WHERE EmployerId = 10 AND SectionID = 13


sp_helptext Usp_MMT_Integration_Employeesdet

EXEC Usp_MMT_Integration_EmployerKeys_Upsert
  @EmployerID = 10,
  @EmployerKey = '2b5d1acb-c91c-4f19-9c0c-46154660a6fe',
  @ActiveKey = 'ec773ae7-b793-4826-8440-30a45aaf4e0a',
  @InactiveKey = 'd4f3f3e1-3f4b-4f6b-8e2e-5f4e6c3b2a1b',
  @Status = 'Active',
  @CreatedBy = 1

select * from TBL_MMT_Integration

UPDATE TEmployeeDetail_Upload SET Status = 'Created' WHERE UploadID = 1908

EXEC Usp_Mydetails_Publicfields 1431

EXEC SP_Mydetails_Enhanced_GetEmpHistoryDetails N'1431', N'Skill Details'

INNER JOIN  TMSkills TSK ON TESHD.SkillId = TSK.SkillID
ORDER BY SkillDetailsHistoryId DESC
sp_help TEmployeeSkillHistoryDetails

EXEC Usp_Mydetails_Publicfields N'30306'

sp_helptext SP_GetActiveInactiveFlagForRole
EXEC SP_GetActiveInactiveFlagForRole 10, 4, 59, 30306


EXEC SP_EMPMD_GetEmpAttachment 1431, 1431
EXEC SP_GetAttachmentCategory 10
EXEC SP_Get_EmpBulkUploadFile 1431, 547
EXEC SP_Mydetails_Enhanced_GetEmpHistoryDetails N'1431', NULL, N'1', N'30', NULL, NULL, N'Future'


  