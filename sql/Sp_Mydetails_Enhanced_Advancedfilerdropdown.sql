/****************************************************************************************************
Copyright : HRMS
Author    :
Date      : April 09 2026
Module    : HRMS

Chatla Jagapathibabu 15-04-2026   BUG138443-Added Extra Parameters
Chatla Jagapathibabu 08-06-2026   BUG145422-Added Extra Parameters
Chatla Jagapathibabu 15-06-2026   BUG146513-changed loops and declarations
Hanh Nguyen          22-06-2026   PERF: SET NOCOUNT ON, ELSE IF chain, removed redundant Work Location loop, guarded sp_executesql, UNION ALL for Status, moved table var declarations into branches
--**************************************************************************
**************************/

CREATE OR ALTER PROCEDURE [dbo].[Sp_Mydetails_Enhanced_Advancedfilerdropdown]
 ( @EmployerId Nvarchar(max)=NULL,@EmployeeId INT=NULL, @FilterData Nvarchar(100)=NULL
 )
 As
 BEGIN
 SET NOCOUNT ON;

 DECLARE @LocationIds    VARCHAR(MAX),
         @BusinessUnitIds VARCHAR(MAX),
         @EmployerIds    VARCHAR(MAX),
         @lv_EmployerId  INT,
         @lv_RoleId      INT,
         @UserID         INT,
         @LogEmployerId  INT,
         @sql            NVARCHAR(MAX),
         @Sno            INT,
         @Cnt            INT,
         @EmployersId    INT;

	SET @UserID =
					(
						SELECT UserID
						FROM TUserEmployee WITH (NOLOCK)
						WHERE EmployeeID = @EmployeeId
					)
	SELECT
			@lv_RoleId = RoleId,
			@lv_EmployerId = EmployerId,
			@EmployerIds = CASE
								WHEN IsGlobalAccess = 'Y' THEN EmployerIds
								ELSE ''
							END
		FROM TUsers U WITH (NOLOCK)
		WHERE U.UserID = @UserID

				SELECT TOP 1
		@LocationIds = LocationIds,
		@BusinessUnitIds = BusinessUnitIds
	FROM dbo.TUSerPagesMapping UPM WITH (NOLOCK)
	WHERE UserID = @UserID
	AND EmployerId = @lv_EmployerId

	SELECT TOP 1
		@LocationIds = CASE WHEN ISNULL(@LocationIds,'') = '' THEN RM.LocationIds ELSE @LocationIds + ','+ISNULL(RM.LocationIds,'') END,
		@BusinessUnitIds = CASE WHEN ISNULL( @BusinessUnitIds,'') = '' THEN RM.BusinessUnitIds ELSE @BusinessUnitIds +','+ ISNULL(RM.BusinessUnitIds,'')END
	FROM dbo.TRolePagesMapping RM WITH (NOLOCK)
	WHERE 1=1
		AND RoleId = @lv_RoleId
		AND EmployerId = @lv_EmployerId

 Select @LogEmployerId=EmployerId from Temployee WITH(NOLOCK) where EmployeeId=@EmployeeId

 DROP TABLE IF EXISTS #Employers
 CREATE TABLE #Employers(ID INT IDENTITY, EmployerId INT)
 Insert into #Employers(EmployerId)
 Select Value from String_split(@EmployerId,',')

 SELECT @Cnt = @@ROWCOUNT, @Sno = 1;
 Select @EmployersId=EmployerId From #Employers where Id=@sno

  IF @FilterData='Business Unit'
  BEGIN
  set @sql='  SELECT UnitID as ID,UnitName Value FROM dbo.TOrgHierarchyDetails  WITH(NOLOCK)  WHERE UnitID in (Select value from string_split(@BusinessUnitIds,'','')) and IsActive=''Y''
  UNION
  SELECT UnitID as ID,UnitName Value FROM dbo.TOrgHierarchyDetails  WITH(NOLOCK)  WHERE UnitID=(Select BusinessUnitID from TemployeeInfo where EmployeeId=@EmployeeId) and IsActive=''Y'''
  END

  ELSE IF @FilterData='Grade'
  BEGIN
  DECLARE @Grade TABLE (GradeId INT,GradeName NVARCHAR(1000), GradeDesc NVARCHAR(1000),GradeBand NVARCHAR(1000),IsActive NVARCHAR(10), UpdatedBy INT, Updatedate datetime,CreatedBy INT, CreatedDate datetime, Employerid INT)

 While @Sno<=@Cnt
 BEGIN
  INSERT INTO @Grade EXEC SP_SEP_GetGradeDetails @EmployerId=@EmployersId ;
  SET @Sno += 1;
 Select @EmployersId=EmployerId From #Employers where Id=@sno
  END
  SELECT GradeId AS ID, GradeName AS Value FROM @Grade
  UNION
  SELECT GradeId AS ID, Case when len(GradeBand)>0 then CONCAT(GradeName, ' - ',GradeBand) else GradeName END AS Value FROM TGrade  WITH(NOLOCK)
  Where GradeId=(Select GradeId From TemployeeInfo where EmployeeId=@EmployeeId) ;
  END

  ELSE IF @FilterData='Designation'
   BEGIN
  DECLARE @Designation TABLE (ID INT, TITLE NVARCHAR(1000),TITLEDESC NVARCHAR(1000),ISACTIVE NVARCHAR(10),DESIGNATIONLEVEL NVARCHAR(1000))

 While @Sno<=@Cnt
 BEGIN
  INSERT INTO @Designation EXEC SP_CM_GetTitle @EmployerId =@EmployersId ;
  SET @Sno += 1;
 Select @EmployersId=EmployerId From #Employers where Id=@sno
  END
  SELECT ID, TITLE AS Value FROM @Designation
  UNION
  SELECT ID, TITLE AS Value FROM TTitle  WITH(NOLOCK)  Where ID=(Select Title From TemployeeInfo  WITH(NOLOCK)  where EmployeeId=@EmployeeId) ;
  END

  ELSE IF @FilterData='Employment Type'
  BEGIN
  set @sql='  Select * from (SELECT ET.EmploymentTypeID as ID,ET.EmploymentType as Value  FROM TMEmploymentTypes ET  Where  ET.EmploymentTypeID=(Select EmploymentTypeID From TemployeeInfo Where EmployeeId=@EmployeeId)
  UNION
    SELECT ET.EmploymentTypeID as ID,ET.EmploymentType as Value  FROM TMEmploymentTypes ET  LEFT JOIN ( SELECT ETW.EmploymentTypeId ,TET.EmploymentType FROM TEmploymentTypeClubWith ETW
  INNER JOIN TMEmploymentTypes TET ON TET.EmploymentTypeId = ETW.EmploymentTypeClubWithId     AND TET.EmployerId = ETW.EmployerId  WHERE ETW.Employerid in (Select value from string_split(@EmployerID,'',''))
  AND ISNULL(TET.IsActive, 1) = 1 ) AS S ON S.EmploymentTypeId = ET.EmploymentTypeId
  WHERE IsActive = 1 AND Employerid in (Select value from string_split(@EmployerID,'',''))  GROUP BY ET.EmploymentTypeID ,ET.EmploymentType) as P ORDER BY Value ASC'
  END

  ELSE IF @FilterData in ('Work Location','Base Location')
	BEGIN
  DECLARE @WorkLocation TABLE (LocationId INT,LocationName NVARCHAR(1000),    CountryId INT,  Address1 NVARCHAR(1000), Address2 NVARCHAR(1000),ZipCode NVARCHAR(1000),PhoneNumber NVARCHAR(1000),
  Fax NVARCHAR(1000),OtherPhoneNumber NVARCHAR(1000),OtherFax NVARCHAR(1000),IsActive NVARCHAR(10),UpdatedBy INT,Updatedate datetime,CreatedBy INT, CreatedDate datetime,Employerid INT, TimeZone NVARCHAR(1000), CreatedDateUtcTime datetime,
  UpdatedateUtcTime datetime, TimeZoneId NVARCHAR(1000),Country NVARCHAR(1000))

  -- @EmployeeId and @LogEmployerId are constant across all employers; single call replaces the redundant loop
  INSERT INTO @WorkLocation EXEC SP_Create_AdminWM_GetLocationByEmployeeId  @EmployeeId,@EmployerId=@LogEmployerId;
  SELECT Distinct LocationId AS ID, LocationName AS Value FROM @WorkLocation ;
	END

  ELSE IF @FilterData in ('Role')
 BEGIN
  DECLARE @EmployeeRole TABLE (EmployeeRoleId INT, EmployeeRoleName NVARCHAR(1000), EmployeeRoleDesc NVARCHAR(1000), IsActive NVARCHAR(10), UpdatedBy INT, Updatedate datetime,CreatedBy INT, CreatedDate datetime, Employerid INT)

 While @Sno<=@Cnt
 BEGIN
  INSERT INTO @EmployeeRole EXEC SP_EMP_GetEmployeeRoleMaster @EmployerId =@EmployersId ;
  SET @Sno += 1;
 Select @EmployersId=EmployerId From #Employers where Id=@sno
  END
  SELECT EmployeeRoleId AS ID, EmployeeRoleName AS Value FROM @EmployeeRole
  UNION
  SELECT EmployeeRoleId AS ID, EmployeeRoleName AS Value  FROM TEmployeeRoleMaster  WITH(NOLOCK)
  Where EmployeeRoleId=(Select EmployeeRoleId From TemployeeInfo  WITH(NOLOCK)  where EmployeeId=@EmployeeId)  and IsActive=1 ;
  END

  ELSE IF @FilterData in ('Skills')
  BEGIN
  set @sql='  SELECT SkillId As ID,SkillName as Value FROM dbo.TMSkills  WITH(NOLOCK)  WHERE  EmployerId in (Select value from string_split(@EmployerID,'','')) And IsActive=''Y'''
  END

  ELSE IF @FilterData in ('Domain')
  BEGIN
  set @sql='  SELECT DomainId As ID,DomainName as Value FROM dbo.TSkillDomainMaster  WITH(NOLOCK)  WHERE  EmployerId in (Select value from string_split(@EmployerID,'','')) And IsActive=1'
  END

  ELSE IF @FilterData in ('Gender')
  BEGIN
   SELECT ID,Gender Value FROM dbo.TGender
   END

  ELSE IF @FilterData in ('Skill Category')
  BEGIN
  set @sql='  SELECT ID as ID, Category as Value FROM TCategory   WITH(NOLOCK)    WHERE  EmployerId in (Select value from string_split(@EmployerID,'','')) And IsActive=''Y'''
  END

  ELSE IF @FilterData in ('PAN Number')
  BEGIN
  set @sql='  SELECT TaxId  as ID, TaxId  as Value from temployee   WITH(NOLOCK)    WHERE  EmployerId in (Select value from string_split(@EmployerID,'','')) And IsActive=''Y'' and TaxId IS NOT NULL and TaxId<>'''''
  END

  ELSE IF @FilterData in ('Visa Type')
  BEGIN
  set @sql='  SELECT VisaTypeId as ID,	VisaType as Value from TVisaType   WITH(NOLOCK)    WHERE  EmployerId in (Select value from string_split(@EmployerID,'','')) '
  END

  ELSE IF @FilterData in ('Visa Country')
  BEGIN
  set @sql='  SELECT ID as ID,	NAME as Value from TCOUNTRY   WITH(NOLOCK)     '
  END

  ELSE IF @FilterData in ('Certification')
  BEGIN
  set @sql='  SELECT CertificateID as ID,	CertificationName as Value from TCertification   WITH(NOLOCK) WHERE  EmployerId in (Select value from string_split(@EmployerID,'',''))    '
  END

  ELSE IF @FilterData in ('Status')
  BEGIN
  Select 'Y' as ID, 'Active' Value
  UNION ALL
  Select 'N' as ID, 'InActive' Value
  END

  ELSE IF @FilterData in ('Discipline')
  BEGIN
  DECLARE @Disciplines TABLE (      ID INT,      QualificationName NVARCHAR(250),      Keywords NVARCHAR(250)  )

   While @Sno<=@Cnt
 BEGIN

  INSERT INTO @Disciplines EXEC SP_EMPMD_GetQualificationName @EmployersId
   SET @Sno += 1;
    Select @EmployersId=EmployerId From #Employers where Id=@sno
  END
  SELECT ID, QualificationName AS Value FROM @Disciplines
  END

  IF @sql IS NOT NULL
  BEGIN
    EXEC SP_EXECUTESQL @sql, N'@EmployerID Nvarchar(max),@EmployeeId INT, @BusinessUnitIds VARCHAR(MAX)', @EmployerID=@EmployerId, @EmployeeId =@EmployeeId ,@BusinessUnitIds=@BusinessUnitIds
  END

  END
