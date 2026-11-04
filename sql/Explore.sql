SELECT   TOP 100 crd.*
FROM     TMyDetailsChangeRequestDetails AS crd
         INNER JOIN
         TMyDetailsChangeRequests AS cr
         ON crd.ChangeRequestId = crd.ChangeRequestId
WHERE    cr.EmployeeId = 1434
ORDER BY crd.ChangeRequestId DESC;

SELECT TOP 100 IsMinor,
               DOB,
               *
FROM   TEmployeeNominee_Details
WHERE  EmployeeId = 1434;

SELECT   TOP 100 IsMinor,
                 DOB,
                 *
FROM     TEmployeeNominee_Details_History
WHERE    EmployeeID = 1434
ORDER BY CreatedDateUtc DESC;

SELECT TOP 100 FieldType_JSON_SQL,
               *
FROM   TEmployeeDetail_Fields
WHERE  DisplayText LIKE '%Branch Name%'
       AND EmployerID = 10;

SELECT DISTINCT TB.BranchName AS ID,
                TB.BranchName AS Value,
                TBK.BankName AS Filter
FROM   TBankBranchDetails AS TB
       INNER JOIN
       TBank AS TBK
       ON TB.BankId = TBK.BankId
WHERE  TB.Employerid = @Employerid
       AND TBK.Bankname IS NOT NULL
       AND TB.BranchName <> '';

SELECT TOP 100 ValidationRule,
               IsValidate,
               FieldType_JSON_SQL,
               DisplayText,
               *
FROM   TEmployeeDetail_Fields
WHERE  SectionID = 14
       AND EmployerID = 10;

DECLARE @Calendar TABLE (
  CalendarId                                   INT            ,
  CalendarName                                 NVARCHAR (1000),
  CalendarDesc                                 NVARCHAR (1000),
  IsActive                                     NVARCHAR (10)  ,
  UpdatedBy                                    INT            ,
  Updatedate                                   DATETIME       ,
  CreatedBy                                    INT            ,
  CreatedDate                                  DATETIME       ,
  Employerid                                   INT            ,
  AllowHolidayOnWeeklyOff                      VARCHAR (10)   ,
  IsHolidayPrecendenceOverWeeklyOff            VARCHAR (10)   ,
  IsHolidayPrecendenceOverWeeklyOffDisplayText VARCHAR (1000) );

INSERT INTO @Calendar
EXECUTE SP_AdminMstr_GetCalendar @employerid;

EXEC SP_Mydetails_Enhanced_GetEmpHistoryDetails 1431

SELECT COUNT(*) FROM TEmployeedetailCustomFields
SELECT COUNT(*) FROM TProcessedBatchResult

sp_helpindex TEmployeedetailCustomFields

SELECT TOP 10 * FROM TEmployeedetailCustomFieldValues ORDER BY 1 DESC

sp_help 'TEmployeedetailCustomFieldValues'

sp_helptext 'SP_Mydetails_Enhanced_GetEmpContactHistoryDetails'

SELECT TOP 100 * FROM TEmployeeDetail_Fields WHERE FieldName LIKE '%Amount%' and employerid = 20

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Nomination%'



sp_help 'TPastEmploymentDetails'
sp_help 'TEducationDetails'
sp_help 'TEmployeeNomination'

SELECT
       Fields.FieldID,
       Fields.FieldName,
       Fields.Length,
       Fields.DisplayText,
       Fields.ValidationRule,
       Fields.FieldType_JSON_SQL,
       Fields.IsValidate,
       Fields.SectionID,
       Section.Section,
       Fields.EmployerId,
       Fields.CountryID,
       Country.NICENAME AS CountryName,
       Fields.DisplayOrder,
       Fields.FieldEntity,
       Fields.FieldTypeID,
       FieldType.FieldType,
       Fields.IsMandatory,
       Fields.IsHidden,
       Fields.IsActive,
       Fields.IsDefault,
       Fields.DB_Table,
       Fields.DB_Column
FROM dbo.TEmployeeDetail_Fields AS Fields
LEFT JOIN dbo.TEmployeeDetail_Section AS Section ON Section.SectionID = Fields.SectionID
LEFT JOIN dbo.TFieldType_LookUp AS FieldType ON FieldType.FieldTypeID = Fields.FieldTypeID
LEFT JOIN dbo.TCOUNTRY AS Country ON Country.ID = Fields.CountryID
AND Fields.CountryID <> 0
WHERE Fields.EmployerId = 10
AND Section.Section LIKE '%Past%'
AND ISNULL(Fields.IsDeleted, 0) = 0
ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName,Fields.FieldID

SELECT TOP 100 * FROM TEmployeeDetail_Fields_Master WHERE FieldName LIKE '%Date of Birth%'

SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%past%'


sp_help 'TPastEmploymentDetails'




DECLARE @FieldIDs VARCHAR(MAX);
SELECT @FieldIDs = STRING_AGG(FieldID, ',') FROM TEmployeeDetail_Fields AS edf
INNER JOIN TEmployeeDetail_Section AS eds ON edf.SectionID = eds.SectionID
WHERE eds.Section LIKE '%Current Employment%'AND edf.IsActive = 1 AND
EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields '2595', @FieldIDs

EXEC dbo.SP_Mydetails_GetNomineeDetails
	@employeeId = 2595


SELECT FieldType_JSON_SQL FROM TEmployeeDetail_Fields WHERE SectionID = 14 and FieldName LIKE '%Review%'

EXEC SP_GetCountryOfEmployment 10

SELECT COUNT(DISTINCT EmailID) FROM TEmployee WHERE EmailID IS NOT NULL
SELECT COUNT(EmployeeID) FROM TEmployee WHERE EmailID IS NOT NULL

SELECT TOP 200 * FROM TEducationDetails WHERE EmployeeID = 1431 ORDER BY 1 DESC 
SELECT TOP 200 * FROM TEmployeeDetail_Section ORDER BY 1 DESC


SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Education%'

EXEC Usp_Mydetails_Enhanced_EmployeeSummary 4070

DECLARE @ManagerId INT = 1431;
DECLARE @SubjectId INT = 1434;

-- Requested Org 10,46,61,84,85,89,90,106,186,189,193,261,293


EXEC [dbo].[Sp_ApproveRejectMyDetailsReview] @EmployeeId = 1431,   -- int                    
                                              @LoggedInUser = 1435, -- int                    
                                              @EmployerId = 10,   -- int                    
                                              @RequestType = 'EmploymentTypeChange', -- varchar(250)                    
                                              @Status = 'Approved',      -- varchar(100)                    
                                              @Comments = 'TEST'     -- varchar(2000)    


SELECT * FROM THrmsModules
SELECT * FROM TModulePages

SELECT mp.ModulePageId, mp.ModulePageName, mp.PageDescription, mp.MappedAppPage, m.ModuleName
FROM dbo.TModulePages mp
JOIN dbo.THrmsModules m ON m.ModuleId = mp.PageModuleId
WHERE mp.ModulePageName = 'MyDetails'
   OR m.ModuleName = 'My Details';

DECLARE @FieldIDs VARCHAR(MAX);
SELECT @FieldIDs = STRING_AGG(FieldID, ',') FROM TEmployeeDetail_Fields AS edf
INNER JOIN TEmployeeDetail_Section AS eds ON edf.SectionID = eds.SectionID
WHERE edf.EmployerID = 20 AND eds.Section LIKE '%Education Details%'AND edf.IsActive = 1 AND edf.CountryID IN (0, 99)

SELECT @FieldIDs

SELECT TOP 100 * FROM TEmployeeDetail_Fields WHERE EmployerId = 20 AND SectionID = 7 AND CountryID IN (0, 99)

EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields '36116', @FieldIDs


DECLARE @Universities TABLE (     UniversityId INT,     UniversityName NVARCHAR(100) )  INSERT INTO @Universities EXEC SP_CM_GetUniversityDet 20  SELECT UniversityId AS ID, UniversityName AS Value FROM @Universities

sp_help TUniversity
sp_helptext SP_AdminEMP_DisBDayAnnivrNotification

SELECT UnitID as ID,UnitName Value FROM dbo.TOrgHierarchyDetails  WITH(NOLOCK)  
  WHERE Employerid in (Select value from string_split('25',',')) and IsActive='Y'
  UNION
  SELECT UnitID as ID,UnitName Value FROM dbo.TOrgHierarchyDetails  WITH(NOLOCK)  
  WHERE UnitID=(Select BusinessUnitID from TemployeeInfo where EmployeeId=2667) and IsActive='Y'

SELECT TOP 100 * FROM TUsers 

EXEC Sp_Mydetails_Enhanced_Advancedfilerdropdown '25', 2667, 'Business Unit'

SELECT TOP 1 
		LocationIds,
		BusinessUnitIds
	FROM dbo.TUSerPagesMapping UPM WITH (NOLOCK)
	WHERE UserID = 2630 
	AND EmployerId = 25

	SELECT TOP 1 
		RM.LocationIds,
		RM.BusinessUnitIds
	FROM dbo.TRolePagesMapping RM WITH (NOLOCK) 
	WHERE 1=1
		AND RoleId = 2
		AND EmployerId = 25

              Select BusinessUnitID from TemployeeInfo where EmployeeId=2667