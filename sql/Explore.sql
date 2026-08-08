
sp_helptext SP_CM_GetAllEmployeeListByOrg_Clone

EXEC SP_GetRoleOrEmployeePermissions  10, 1431, NULL

EXEC Sp_Mydetails_Tabs_Modules  

EXEC Sp_MydetailsGetEmployeePermissions 1431, 10

EXEC Sp_MydetailsRolebasedPermission
SELECT TOP 100 * FROM TEmployeeDetail_Section
SELECT TOP 100 * FROM tMenuDetails WHERE EmployerId = 10 AND MenuId = 5
SELECT TOP 100 * FROM TTabDetails WHERE MenuId = 5


SELECT TOP 100 * FROM TEmployerDetails WHERE custid = 'C00010'
SELECT custid, Employerid, EmployerName FROM TEmployerDetails WHERE EmployerName LIKE '%Child%'

EXEC Sp_CM_Mydetails_DirectIndirectReports 1432, 0, NULL, 10
EXEC Sp_CM_Mydetails_DirectIndirectReports 1432, 0, NULL, 46

-- Direct Reportees
EXEC Sp_CM_Mydetails_DirectIndirectReports_Count 
    @EmployeeId = 1432,
    @RankLevel = 0,
    @IsActive = NULL,
    @EmployerId = '10,46'

-- Indirect Reportees
EXEC Sp_CM_Mydetails_DirectIndirectReports_Count 
    @EmployeeId = 1431,
    @RankLevel = 1,
    @IsActive = NULL,
    @EmployerId = 10

-- All Reportees
EXEC Sp_CM_Mydetails_DirectIndirectReports_Count 
    @EmployeeId = 1431,
    @RankLevel = -3,
    @IsActive = '',
    @EmployerId = 10
 
EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields N'1431', N'1975,1977,1978,1979,1971,1972,1973,1980,114344'
EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields N'1431', N'1920,1923,1921,1922,1926,1924'

SELECT TEF.IsLocked, TEF.FieldID, TEF.CountryID, TEF.ValidationRule, TEF.Format, TEF.FieldEntity, TEF.FieldType_JSON_SQL, TEF.IsValidate, TEF.IsMandatory, TEF.IsHidden, TEF.FieldTypeID, TEF.FieldName, TEF.DisplayText, TEF.IsActive
, TEF.DB_Table, TEF.DB_Column
FROM TEmployeeDetail_Fields AS TEF
    INNER JOIN TEmployeeDetail_Section AS S ON S.SectionID = TEF.SectionID
WHERE S.Section IN (N'personal Details')

SELECT TUS.*
FROM TEmployeeDetail_Upload_Section AS TUS
    INNER JOIN TEmployeeDetail_Upload AS TU ON TUS.UploadID = TU.UploadID
WHERE TUS.UploadID = (SELECT MAX(UploadID)
FROM TEmployeeDetail_Upload
WHERE CreatedBy = 1431)

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%designation%'

SELECT TOP 100 * FROM TTitle WHERE Employerid = 10

-- UPDATe TTitle SET Title = 'Client support Executive Client support Executive' WHERE Employerid = 10 AND ID = 2390

sp_helptext Sp_TnE_GetAllClaims

sp_helptext 'SP_AdminEMP_EnableEmployee'

SELECT TOP 100 * FROM TCLAIM
SELECT TOP 100 * FROM TCLAIM_ASSIGNMENT WHERE EmployeeId IS NOT NULL


SELECT TOP 100 * FROM TCustomerSettings WHERE EmployerId = 10

SELECT TOP 100 FieldType_JSON_SQL, ValidationRule, DisplayText FROM TEmployeeDetail_Fields WHERE SectionID = 14 AND EmployerID = 10 AND FieldType_JSON_SQL IS NOT NULL
-- UPDATE TCustomerSettings SET IsMultiplePayrollAllowed = 0 WHERE EmployerId = 10


1
SELECT * FROM TEmployeeBankDetails
      WHERE EmployeeId = 1431 AND Payroll = 1

SELECT TOP 100 * FROM TEmployeeInfo WHERE EmploymentNumber = 'EMP-005'

select TOP 10 * from TEmployeeDetail_Upload order by UploadID desc

select TOP 10 * from TEmployeeDetail_Upload_Section WHERE UploadID = 2458  


EXEC Sp_BulkProfileAdminRoleM_GetTabRoleDet 10, 1431
    EXEC SP_GetRoleOrEmployeePermissions 10, NULL, 1431

     EXEC Sp_CM_Mydetails_DirectIndirectReports N'1431', -3, N'', N'10', NULL, N'Y'


EXEC SP_CM_GetAllRoleManagementListDetails 10
EXEC SP_CM_GetRoleDetailsByRoleId 137

EXEC USP_GetLogo 'C00010'
EXEC USP_GetLogo_InCloud 'C00010'

sp_helptext SP_SEP_GetSeparationType

sp_helptext Sp_AdminEMP_CopyEmployee
sp_helptext Sp_Revamp_Search_Advancedfilerdropdown

EXEC Sp_Mydetails_Enhanced_Getfilters 10, 1431
EXEC Sp_Revamp_Search_Advancedfilerdropdown 10, 1431

SELECT o.name AS Procedure_Name, m.definition as Procedure_Text
FROM sys.sql_modules m
INNER JOIN sys.objects o
ON m.object_id = o.object_id
WHERE m.definition LIKE '%Getfilters%' 
AND o.type = 'P'
ORDER BY o.name

EXEC Sp_CM_Mydetails_DirectIndirectReports N'1431', -3, N'', N'10', N'[{'Field':'Valid Up To','Operator':'After','Value':'2026-05-29'}]', N'Y'

sp_helptext SP_AdminEMP_DisBDayAnnivrNotification

SELECT BankDetailId, AccountNo FROM TEmployeeBankDetails WHERE AccountNo = 78387353

sp_helptext USP_GetSeparationReasons
sp_helptext SP_Separation_LeaveDetails


select TOP 100 * from TPersonalTitle

 EXEC SP_Separation_LeaveDetails 1442, 10 , N'01-06-2026'

 SELECT * from TLeaveTypeMaster
    WHERE EmployerId = 10 AND IsActive = 1 AND Gender IN ('M', 'F', 'B')

    SELECT CASE 
			WHEN Gender = 'M'
				THEN 1
			WHEN Gender = 'F'
				THEN 2
			END AS Gender
		,LeaveCode
	FROM TLeaveTypeMaster
	WHERE Employerid = 10
	AND Gender in ('M','F')
	AND ISNULL(IsActive,1) = 1

	SELECT CASE 
			WHEN Gender = 'B'
				THEN 1
			END AS Gender
		,LeaveCode
	FROM TLeaveTypeMaster
	WHERE Employerid = 10
	AND Gender in ('B')
	AND ISNULL(IsActive,1) = 1

    UPDATE TLeaveTypeMaster SET LeaveCode = 'SL_T' WHERE LeaveTransactionId = 1147

EXEC SP_Mydetails_Enhanced_GetEmpHistoryDetails 25740, 'Family Details', 1, 30, NULL, NULL, 'History', NULL

sp_helptext 'Sp_Mydetails_Tabs_Modules'

sp_helptext USP_UPD_TCustomerSettings_EmployeeManagement
select TOP 100 * from TEmployeeDetail_Section
select TOP 100 validationRule, * from TEmployeeDetail_Fields WHERE EmployerId = 10 AND SectionID = 8

,
exec SP_Get_MyDetails_EmpBulkUploadFile 1431

sp_helptext SP_Get_EmpBulkUploadFile

sp_helptext SP_Get_MyDetails_EmpBulkUploadFile

SELECT TOP 100 * FROM TAttachmentCategory WHERE Employerid = 10

SELECT TOP 100 * FROM TBulkUpload WHERE CategoryId = 109

sp_helptext Sp_Mydetails_Enhanced_Advancedfilerdropdown

  INSERT INTO @WorkLocation EXEC SP_Create_AdminWM_GetLocationByEmployeeId  @EmployeeId,@EmployerId=@LogEmployerId; 


  sp_helptext SP_Create_AdminWM_GetLocationByEmployeeId

  EXEC SP_EMPMD_GetEmpAttachment 1431,1431

sp_helptext Sp_GetTabRoleDetails

  EXEC Sp_GetTabRoleDetails 10, 5

SELECT TOP 100 * FROM TMenuDetails WHERE MenuId = 5 AND EmployerID = 10

SELECT TOP 100 * FROM TTabDetails WHERE MenuId = 5

SELECT TOP 100
    *
FROM TTabDetails
WHERE TabName IN ('Discipline','Awards & Medals','Internal & External Courses','Overseas Exposure','ACCF Claim','Medical Details','Vaccination Details')

SELECT TOP 100 FieldType_JSON_SQL, ValidationRule, FieldName, * FROM TEmployeeDetail_Fields where employerId = 10 AND SectionID = 14

EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields '1431', '2052,2054,2055'

DECLARE @FunctionalManager TABLE (ID               INT,
    EmployeeId       INT,
    Name             NVARCHAR(300),
    Title            NVARCHAR(300),
    Employerid       INT,
    EmployerName     NVARCHAR(300),
    EmploymentNumber NVARCHAR(300),
    EmailId          NVARCHAR(300),
    EmpName          NVARCHAR(300))
INSERT INTO @FunctionalManager
EXEC SP_Creation_Admin_GetAllEmployeeDetails @EmployerId,Null,@EmployeeId;
SELECT ID, NAme AS Value
FROM @FunctionalManager

EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields N'1431', N'2028,98694,2029,2032,2033,2034,2035,2030,2036,2037,2038,2039,2041,2042,109360,2043,2044,2045,2046,2047,2048,2049,2027,2050,2051,2052,2053,2054,2055,2058,2059,2060,2056,109359,2057,2040'

SELECT TOP 100 EmploymentNumber, TE.IsActive FROM TEmployeeInfo TEI
INNER JOIN TEmployee TE ON TEI.EmployeeId = TE.EmployeeId
Where TEI.Employerid = 25

SELECT TOP 100 * FROM TEmployeeDetail_Fields_Master
SELECT TOP 100 ValidationRule, * FROM TEmployeeDetail_Fields WHERE SectionID = 14 AND EmployerID = 10

-- UPDATE TEmployeeDetail_Fields SET FieldsGroup = 'IsAutoPresent,AutoPresentEffectiveFrom' WHERE FieldID IN (2057,115216)

SELECT * FROM TEmployeeInfo WHERE EmploymentNumber = '067120'
SELECT Showbirthday, * FROM TEmployee WHERE EmployeeId = 1435

sp_helptext SP_AdminEMP_DisBDayAnnivrNotification

EXEC SP_AdminEMP_DisBDayAnnivrNotification '1435', 1, 1
-- Final destination for bulk document import job
SELECT SchedulerName, ConfigKey, ConfigValue, employerid
FROM Tjobschedulerconfiguration
WHERE SchedulerName = 'DocumentBulkUploadMoveScheduler'
  AND ConfigKey IN ('DestinationPath', 'LogFilePath');

-- COB / bulk upload base path
EXEC SP_CM_GetEmailTemplatesDocumentPath @DocumentType = 'ClientOnboarding';

-- Pending bulk upload requests and their staging paths
EXEC SP_Get_BulkUploadFile;  -- optional @EmployerId


EXEC Usp_Mydetails_Enhanced_EmployeeSummary 26468

EXEC SP_LA_GetFreezeAttendanceDetails 10
SELECT
  e.EmployeeId,
  e.EmploymentNumber,
  td.TerminationDetailId,
  td.SeparationTypeId,
  -- st.SeparationTypeDescription,
  td.ApproveStatus,
  td.IsTerminationClose
FROM TEmployeeInfo e
JOIN TTerminationDetail td ON td.EmployeeId = e.EmployeeId
-- LEFT JOIN TSeparationType st ON st.SeparationTypeId = td.SeparationTypeId
WHERE e.EmploymentNumber = '10263'
ORDER BY td.TerminationDetailId DESC;



-- Compare with the dropdown options for that employer:
SELECT SeparationTypeId, SeparationTypeDescription, IsActive
FROM TSeparationType
WHERE EmployerId = (SELECT EmployerId FROM TEmployeeInfo WHERE EmploymentNumber = '10263')
  AND SeparationTypeDescription LIKE '%Termination%';


EXEC SP_EMPMD_GetEmpAttachment 18626, 18626

exec SP_Get_MyDetails_EmpBulkUploadFile 4880

SELECT TOP 100 * FROM TEmployeeInfo WHERE EmploymentNumber ='T0065651'

SELECT
  ea.AttachmentId,
  ea.EmployeeId,
  e.EmploymentNumber,          -- if you join TEmployeeInfo
  ac.Category,
  ea.AttachchedFileName,
  ea.Comments,
  ea.LastUpdatedOn,
  ea.LastUpdatedBy
FROM TEmployeeAttachment ea
INNER JOIN TAttachmentCategory ac ON ac.ID = ea.CategoryId
INNER JOIN TEmployee e ON e.EmployeeId = ea.EmployeeId
-- WHERE ea.EmployeeId = 4880
-- WHERE e.EmploymentNumber = 'T0065651'
ORDER BY ea.LastUpdatedOn DESC;


sp_helptext SP_Get_MyDetails_EmpBulkUploadFile

SELECT TOP 100 ValidationRule, * FROM TEmployeeDetail_Fields WHERE EmployerId = 10 AND SectionID = 1

SELECT TOP 100 * FROM TEmployeeDetail_Upload_Section ORDER BY UploadSectionID DESC

SELECT TOP 100 * FROM TEmployee WHERE EmployerID = 25 AND FName LIKE '%User%'
sp_help TEmployeeInfo
SELECT TOP 100 LastWorkingDate, * FROM TEmployeeInfo WHERE EmployeeId = 26473

EXEC Usp_Mydetails_Enhanced_EmployeeSummary 26473

sp_helptext Usp_Mydetails_Enhanced_EmployeeSummary

EXEC SP_LA_GetFreezeAttendanceDetails 10


-- Employees counted by Employee Search (EI.Title IS NOT NULL) but excluded by My Details
-- (T.Title IS NULL after the join) — the Title-FK-doesn't-resolve case
SELECT E.EmployeeId, dbo.Fn_GetEmployeeName(E.EmployeeId) AS EmpName, EI.Title AS TitleId, E.IsActive
FROM TEmployee E WITH (NOLOCK)
INNER JOIN TEmployeeInfo EI WITH (NOLOCK) ON EI.EmployeeId = E.EmployeeId AND EI.EmployerID = E.EmployerId
LEFT JOIN TTitle T WITH (NOLOCK) ON T.ID = EI.Title AND EI.EmployerID = T.Employerid
WHERE E.EmployerId = 10 AND E.IsActive = 'Y'
  AND EI.Title IS NOT NULL AND T.Title IS NULL;

-- Employees counted by My Details but excluded by Employee Search — the missing-org-chart-row case
SELECT E.EmployeeId, dbo.Fn_GetEmployeeName(E.EmployeeId) AS EmpName, E.IsActive
FROM TEmployee E WITH (NOLOCK)
WHERE E.EmployerId = 10 AND E.IsActive = 'Y'
  AND NOT EXISTS (SELECT 1 FROM TORGChart o WHERE o.EmployeeId = E.EmployeeId);


EXEC SP_Mydetails_Enhanced_GetEmpPersonalHistoryDetails 26654



SELECT TOP 100 * FROM TEmployeeEmergencyContactDetails WHERE EmployeeId = 1431 ORDER BY EmergencyContactID DESC 
SELECT TOP 100 FieldType_JSON_SQL, FieldName, * FROM TEmployeeDetail_Fields WHERE SectionID = 14 AND EmployerId = 10 AND FieldType_JSON_SQL IS NOT NULL
SELECT TOP 100 * FROM TEmployeeInfo WHERE EmploymentNumber = '00067'
sp_helptext SP_CM_GetTitle 

sp_help TEmployeeInfo


EXEC SP_AdminWM_GetHRMSModules 10

select TOP 100 * from TEmployeeInfo WHERE EmploymentNumber = 'PT0000001'

DECLARE @EmployerId INT = 10;
DECLARE @Designation TABLE (ID INT, TITLE NVARCHAR(1000),TITLEDESC NVARCHAR(1000),ISACTIVE NVARCHAR(10),DESIGNATIONLEVEL NVARCHAR(1000))  INSERT INTO @Designation EXEC SP_CM_GetTitle @EmployerId ; SELECT ID, TITLE AS Value FROM @Designation;
DECLARE @EmployeeRole TABLE (EmployeeRoleId INT, EmployeeRoleName NVARCHAR(1000), EmployeeRoleDesc NVARCHAR(1000), IsActive NVARCHAR(10), UpdatedBy INT, Updatedate datetime,CreatedBy INT, CreatedDate datetime, Employerid INT)  INSERT INTO @EmployeeRole EXEC SP_EMP_GetEmployeeRoleMaster @EmployerId ; SELECT EmployeeRoleId AS ID, EmployeeRoleName AS Value FROM @EmployeeRole;
DECLARE @WorkLocation TABLE (LocationId INT,LocationName NVARCHAR(200),    CountryId INT,  Address1 NVARCHAR(200), Address2 NVARCHAR(200),ZipCode NVARCHAR(200),PhoneNumber NVARCHAR(200),Fax NVARCHAR(200),OtherPhoneNumber NVARCHAR(200),OtherFax NVARCHAR(200),IsActive NVARCHAR(10),UpdatedBy INT,Updatedate datetime,CreatedBy INT, CreatedDate datetime,Employerid INT, TimeZone NVARCHAR(200), CreatedDateUtcTime datetime,UpdatedateUtcTime datetime, TimeZoneId NVARCHAR(200),Country NVARCHAR(200))  INSERT INTO @WorkLocation EXEC SP_Create_AdminWM_GetLocationByEmployeeId  @EmployeeId,@EmployerId ; SELECT LocationId AS ID, LocationName AS Value FROM @WorkLocation ;
DECLARE @WorkLocation TABLE (LocationId INT,LocationName NVARCHAR(200),    CountryId INT,  Address1 NVARCHAR(200), Address2 NVARCHAR(200),ZipCode NVARCHAR(200),PhoneNumber NVARCHAR(200),Fax NVARCHAR(200),OtherPhoneNumber NVARCHAR(200),OtherFax NVARCHAR(200),IsActive NVARCHAR(10),UpdatedBy INT,Updatedate datetime,CreatedBy INT, CreatedDate datetime,Employerid INT, TimeZone NVARCHAR(200), CreatedDateUtcTime datetime,UpdatedateUtcTime datetime, TimeZoneId NVARCHAR(200),Country NVARCHAR(200))  INSERT INTO @WorkLocation EXEC SP_Create_AdminWM_GetLocationByEmployeeId  @EmployeeId,@EmployerId ; SELECT LocationId AS ID, LocationName AS Value FROM @WorkLocation ;
DECLARE @Calendar TABLE (CalendarId INT,CalendarName NVARCHAR(1000), CalendarDesc NVARCHAR(1000), IsActive NVARCHAR(10), UpdatedBy INT, Updatedate datetime,CreatedBy INT, CreatedDate datetime, Employerid INT, AllowHolidayOnWeeklyOff Varchar(10),IsHolidayPrecendenceOverWeeklyOff Varchar(10), IsHolidayPrecendenceOverWeeklyOffDisplayText varchar(1000)) INSERT INTO @Calendar EXEC SP_AdminMstr_GetCalendar @employerid ; SELECT CalendarId AS ID, CalendarName AS Value FROM @Calendar ;
Declare @ShiftMasterdetails As Table(ID Int, Value Varchar(100), Filter Varchar(100))  Insert Into @ShiftMasterdetails Exec Sp_Creation_ShiftDetails @EmployerId  Select ID , Value , Filter from @ShiftMasterdetails
DECLARE @Grade TABLE (GradeId INT,GradeName NVARCHAR(1000), GradeDesc NVARCHAR(1000),GradeBand NVARCHAR(1000),IsActive NVARCHAR(10), UpdatedBy INT, Updatedate datetime,CreatedBy INT, CreatedDate datetime, Employerid INT)  INSERT INTO @Grade EXEC SP_SEP_GetGradeDetails @EmployerId ; SELECT GradeId AS ID, GradeName AS Value FROM @Grade ;
DECLARE @SkillCategory TABLE (ID INT,Category NVARCHAR(1000))INSERT INTO @SkillCategory EXEC SP_EC_GetCategoryListDetails @EmployerId ; SELECT ID, Category AS Value FROM @SkillCategory ;
DECLARE @FunctionalManager TABLE (ID INT,EmployeeId INT,Name NVARCHAR(300),Title NVARCHAR(300), Employerid INT,EmployerName NVARCHAR(300),EmploymentNumber NVARCHAR(300), EmailId NVARCHAR(300),EmpName NVARCHAR(300))   INSERT INTO @FunctionalManager EXEC SP_Creation_Admin_GetAllEmployeeDetails @EmployerId,Null,@EmployeeId; SELECT ID, NAme AS Value FROM @FunctionalManager;