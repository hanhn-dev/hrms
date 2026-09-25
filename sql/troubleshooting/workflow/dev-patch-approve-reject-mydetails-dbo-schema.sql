-- =============================================================================
-- DEV-ONLY patch: Sp_ApproveRejectMyDetailsReview
--
-- Adds the dbo schema filter on the Family + Bank NEW-ROW INSERT column lists
-- so sys.tables does not also match Clone.* copies on DEV.
--
-- Revert with: dev-revert-approve-reject-mydetails-dbo-schema.sql
-- Do not run on QA / UAT / PROD. Do not treat this as a Liquibase deploy.
-- =============================================================================

--Chatla Jagapathibabu   09-02-2026    PBI#128169 added history                
--Hanh Nguyen            21-09-2026    Education/Emergency: history UTC timestamps; CustDetailId update by ChangeRequestId
                
CREATE OR ALTER PROCEDURE [dbo].[Sp_ApproveRejectMyDetailsReview](                
  @EmployeeId INT                    
 ,@LoggedInUser INT                    
 ,@EmployerId INT                    
 ,@RequestType VARCHAR(250)                    
 ,@Status VARCHAR(100)                    
 ,@Comments VARCHAR(2000) )                
 As                
/*                    
 -- =========================================================================================                    
 -- Author: Ashish Pawar                     
 -- Create date: 20-05-2021                    
 -- Description: Send for Review WorkFlow                    
 -- =========================================================================================                    
 EXEC [dbo].[Sp_ApproveRejectMyDetailsReview] @EmployeeId = 2255,   -- int                    
                                              @LoggedInUser = 1431, -- int                    
                                              @EmployerId = 43,   -- int                    
                                              @RequestType = 'EmploymentTypeChange', -- varchar(250)                    
                                              @Status = 'Approved',      -- varchar(100)                    
                                              @Comments = 'TEST'     -- varchar(2000)                    
                     
 -- =========================================================================================                    
 --     MOdified by                Date                 Reason                    
 -- =========================================================================================                    
 -- Rahul C          added #TEmployeePassportDetails to store non update data when update happend #57912                    
 -- Divyang          08-26-2024     TEmployeeAttachment - 83417                    
 -- Prajakta Kadam   23-05-2025     PBIID:100729(Table names are changed for custom field data)                   
 -- Chatla Jagapathibabu   08-01-2026  PBIID:124656(added UTC time )                 
 -- Chatla jagapathibabu   27-01-2026   PBI/BUG 127602 (Custom Fields change for isnew 0 and 1)                
 --Chatla Jagapathibabu   09-02-2026    PBI#128169 added history                
 --Chatla Jagapathibabu   20-03-2026    PBI#125421 certification section error                
  --Chatla Jagapathibabu   25-03-2026    PBI#131959 passport section error                
--Chatla Jagapathibabu   26-03-2026    PBI#135581 Family section history                
--Chatla Jagapathibabu   04-05-2026    PBI#140519 Nomination section history                
Chatla Jagapathi Babu 02-06-26    BUG 144450                
Chatla Jagapathi Babu 11-06-26    BUG 145178                
 Hanh Nguyen	21-09-2026    Education/Emergency approve: set history UTC timestamps; fix CustDetailId
                              link (was WHERE CustDetailId = ChangeRequestId)
 -- ========================================================================================                    
                
*/                    
                    
BEGIN                    
                     
 --DECLARE @EmployeeId INT = 2255                    
 --DECLARE @LoggedInUser INT = 1431                    
 --DECLARE @EmployerId INT = 43                    
 --DECLARE @RequestType VARCHAR(250) ='EmploymentTypeChange'                    
 --DECLARE @Status VARCHAR(100) ='Approved'                    
 --DECLARE @Comments VARCHAR(2000) ='TEST'                    
    DECLARE @VisaID INT                
 DECLARE @EmergencyDetailID INT                
 DECLARE @CustomFieldId INT                
 DECLARE @CertificationID INT                
 DECLARE @FamilyDetailID INT                
 DECLARE @NominationID INT                
 DECLARE @PastEmploymentID INT                
 DECLARE @EducationID INT             
 DECLARE @BankDetailID INT            
 SET NOCOUNT ON                    
 SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED                    
                     
 EXEC Sp_OpenEncryptionKeys                    
              
 DECLARE @ChangeRequestId INT                    
 DECLARE @LV_ChangeRequestId INT = @EmployeeId                    
 DECLARE @CreatedBy INT;                  
 SET @EmployeeId = (                    
   SELECT TOP 1 EmployeeId                    
   FROM TMyDetailsChangeRequests                    
   WHERE ChangeRequestId = @EmployeeId                    
   )                    
                    
 CREATE TABLE #tmpFlowDetails (                    
  WorkflowId INT                    
  ,Tree VARCHAR(MAX)                    
  ,SkipWorkFlow BIT                    
  )                    
                    
 INSERT INTO #tmpFlowDetails                    
 EXEC SP_CM_GetWorkflowTreeXmlDetailsByPageTitle @RequestType ,@EmployerId, @EmployeeId                    
                    
 DECLARE @RoutingLevel INT = (                    
   SELECT MAX(RoutingLevels)                    
   FROM TWorkflowDetails                    
   WHERE WorkflowId = (                    
     SELECT WorkflowId                    
     FROM #tmpFlowDetails                    
     )                    
   )                    
 DECLARE @CurrentLevel INT = (                    
   SELECT MAX(ApprovalLevel)                    
   FROM TRequestWorkflows                    
   WHERE WorkflowId = (                    
     SELECT WorkflowId                    
     FROM #tmpFlowDetails                    
     )                    
    AND ManagerId = @LoggedInUser                    
   )                    
 --DECLARE @ChangeRequestId INT                   
 --DECLARE @LV_ChangeRequestId INT = @EmployeeId                    
                    
 --SET @EmployeeId = (                    
 --  SELECT TOP 1 EmployeeId                 
 --  FROM TMyDetailsChangeRequests                    
 --  WHERE ChangeRequestId = @EmployeeId                    
 --  )                    
                    
 BEGIN TRY                    
  BEGIN TRANSACTION                    
                    
  IF @RoutingLevel > 0                    
  BEGIN                    
   DECLARE email_cursor CURSOR                    
   FOR                    
   SELECT DISTINCT TR.ChangeRequestId                    
   FROM TMyDetailsChangeRequestDetails TD                    
   JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
   WHERE TR.EmployeeId = @EmployeeId                    
    AND EmployerId = @EmployerId                    
    AND Comments IS NULL                    
    AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                  
   OPEN email_cursor                    
                    
   FETCH NEXT                    
   FROM email_cursor                    
 INTO @ChangeRequestId                    
                    
   WHILE @@FETCH_STATUS = 0                    
   BEGIN                    
    INSERT INTO TEmailNotification (                    
     TemplateName                    
     ,TransId                    
     ,ActionByEmployeeID                    
     ,RequestOwnerEmployeeID                    
     ,Employerid                    
     ,ActionName                    
     ,wfID                    
     ,CreatedBy                    
     ,CreatedDate                    
     ,UpdatedBy                    
     ,Updatedate                    
     ,STATUS                    
     ,MultiId                    
     )                    
    VALUES (                    
     'EmploymentTypeChange'                    
     ,@ChangeRequestId                    
     ,@EmployeeId                    
     ,@EmployeeId                    
     ,@Employerid                    
     ,CASE                     
      WHEN @Status = 'Approved'                    
       THEN 'Approve'                    
      ELSE 'Reject'                    
      END                    
     ,(                    
      SELECT WorkflowId                    
      FROM #tmpFlowDetails                    
      )                    
     ,@LoggedInUser                    
,GETDATE()                    
     ,@LoggedInUser                    
     ,GETDATE()                    
     ,'Pending'                    
     ,@EmployeeId                    
     )                    
                    
    FETCH NEXT                    
    FROM email_cursor                    
    INTO @ChangeRequestId                    
END                    
                    
   CLOSE email_cursor;                    
                    
   DEALLOCATE email_cursor;                    
                    
   IF @Status = 'Approved'                    
   BEGIN                    
    IF @RoutingLevel = @CurrentLevel                    
    BEGIN                    
     DECLARE @sql NVARCHAR(MAX)                    
               
     SET @sql = ''                    
                    
     --TEmployee Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       INNER JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployee'                    
   AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                   
                  
 Insert Into TEmployeeHistory(EmployeeId,FName,LName,FatherName,MotherName,PermanentAddress,HomeNumber,CellNumber,EmailID,IsActive,TitleID,PostalAddress,                
                                Nationality,MaritalStatusID,PassportNumber,MiddleName,WeddingDate,EthnicGroup,ExtensionNumber,PersonalEmailId,ShiftId,                
           CountryOfBirth,RoleId,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,effectivedate,StateofBirth,PermanentZipCode,PostalZipCode,                
           OtherStateOfBirth,AadharNumber,CreatedDateUtcTime,UpdatedDateUtcTime,BirthCountryName,BirthZipCode,ReligionId,LanguageSpeakIds,                
           LanguageWriteIds,LanguageReadIds,Gender,TaxId,DoB,PlaceOfBirth,BloodGroup,StateId,ShowBirthday)---Added on 09-02-2017                
   Select EmployeeId,FName,LName,FatherName,MotherName,PermanentAddress,HomeNumber,CellNumber,EmailID,IsActive,TitleID,PostalAddress,                
          Nationality,MaritalStatusID,PassportNumber,MiddleName,WeddingDate,EthnicGroup,ExtensionNumber,PersonalEmailId,ShiftId,                
    CountryOfBirth,RoleId,CreatedBy,CreatedDate,IsNull(UpdatedBy, CreatedBy),IsNull(UpdatedDate,CreatedDate),effectivedate,StateofBirth,PermanentZipCode,                
    PostalZipCode,OtherStateOfBirth,AadharNumber,CreatedDateUtcTime,UpdatedDateUtcTime,BirthCountryName,BirthZipCode ---Added on 09-02-2017                
    ,ReligionId,LanguageSpeakIds,LanguageWriteIds,LanguageReadIds,Gender,TaxId,DoB,PlaceOfBirth,BloodGroup,StateId,ShowBirthday                
  From TEmployee                 
   Where EmployeeId=@EmployeeId                
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                  
         THEN Tr.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          )                    
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ' , UpdatedDate = GETDATE(),UpdatedDateUtcTime=GETUTCDATE(),UpdatedBy = '+ CAST(TD.CreatedBy AS VARCHAR(20)) +'  Where EmployeeId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployee'                    
       AND TR.TableName = 'TEmployee'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                    
            
      SET @sql = ''                    
       ---Changes Done on 11010222                    
       --DECLARE employee_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                    
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TEmployee' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN employee_cursor                       
       --FETCH NEXT FROM employee_cursor                        
       --INTO @ChangeRequestId                    
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
       --Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM employee_cursor                        
       --INTO @ChangeRequestId                    
       --END                        
       --CLOSE employee_cursor;                        
       --DEALLOCATE employee_cursor;                    
       ---END Changes Done on 11010222                    
     END                    
                    
     --TEmployeeFamilyDetails Insert New                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId               
       WHERE TableName = 'TEmployeeFamilyDetails'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE family_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      INNER JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeeFamilyDetails'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN family_cursor                    
                    
      FETCH NEXT                    
      FROM family_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TEmployeeFamilyDetails ( [EmployeeID],[IsDelete],[CreatedDate],[CreatedBy],[UpdatedBy],[CreatedDateUtc],[UpdatedDateUtc],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id             
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeFamilyDetails'                    
           AND TD.TableName = 'TEmployeeFamilyDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                
          FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',0,GETDATE(),'+Cast(@EmployeeId As varchar(100))+','+Cast(@EmployeeId As varchar(100))+',GETUTCDATE(),GETUTCDATE(),' + STUFF((                    
          SELECT ',' + CASE                     
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
      WHERE t.name = 'TEmployeeFamilyDetails'                    
           AND TD.TableName = 'TEmployeeFamilyDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                 
          ), 1, 1, '') + ');                
                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@FamilyDetailID OUTPUT;                   

       IF @FamilyDetailID IS NOT NULL
       BEGIN
        INSERT INTO dbo.TEmployeeFamilyDetails_history
        (
        EmployeeFamilyDetailID,EmployeeID,Relation,Student,Name,Insured,DateOfBirth,
        Occupation,Gender,OtherInsurance,Dependant,GraduationDate,Address,Comments,Minor,SSN,
        GuardianAddress,GuardianName,Smoker,IsSubmit,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
        UpdatedDate,AadharNumber, CreatedDateUtc,UpdatedDateUtc,LastmodifiedOn
        )
        SELECT EmployeeFamilyDetailID,EmployeeID,Relation,Student,Name,Insured,DateOfBirth,
        Occupation,Gender,OtherInsurance,Dependant,GraduationDate,Address,Comments,Minor,SSN,
        GuardianAddress,GuardianName,Smoker,IsSubmit,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
        UpdatedDate,AadharNumber, CreatedDateUtc,UpdatedDateUtc,GETDATE()
        FROM dbo.TEmployeeFamilyDetails WITH (NOLOCK)
        WHERE EmployeeFamilyDetailID = @FamilyDetailID;
       END
                
       SET @sql = ''                
    IF EXISTS (Select 1 from TMyDetailsChangeRequestDetails Where CustDetailId=@ChangeRequestId)                
    BEGIN                
       Update TMyDetailsChangeRequestDetails set CustDetailId=@FamilyDetailID                 
    Where CustDetailId=@ChangeRequestId                
    END                
                
    IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                   
                         FETCH NEXT                    
       FROM family_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE family_cursor;                    
                    
      DEALLOCATE family_cursor;                    
     END                    
                    
     --TEmployeeFamilyDetails Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeFamilyDetails'                    
        AND IsNew = 0                    
       AND IsApproved IS NULL                    
AND TR.EmployeeId = @EmployeeId                    
AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                  
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                    
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ' , UpdatedDate = GETDATE(),UpdatedDateUtc=GETUTCDATE(),UpdatedBy='+Cast(@EmployeeId As varchar(100))+'  Where EmployeeFamilyDetailID= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeFamilyDetails'                    
       AND TR.TableName = 'TEmployeeFamilyDetails'                   
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;

      -- After-apply snapshot (Education-style). A before-apply copy keeps the old
      -- Relation / UpdatedDateUtc, so history-only Past History never sees the edit.
      INSERT INTO dbo.TEmployeeFamilyDetails_history
      (
      EmployeeFamilyDetailID,EmployeeID,Relation,Student,Name,Insured,DateOfBirth,
      Occupation,Gender,OtherInsurance,Dependant,GraduationDate,Address,Comments,Minor,SSN,
      GuardianAddress,GuardianName,Smoker,IsSubmit,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
      UpdatedDate,AadharNumber, CreatedDateUtc,UpdatedDateUtc,LastmodifiedOn
      )
      SELECT EmployeeFamilyDetailID,EmployeeID,Relation,Student,Name,Insured,DateOfBirth,
      Occupation,Gender,OtherInsurance,Dependant,GraduationDate,Address,Comments,Minor,SSN,
      GuardianAddress,GuardianName,Smoker,IsSubmit,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
      UpdatedDate,AadharNumber, CreatedDateUtc,UpdatedDateUtc,GETDATE()
      FROM dbo.TEmployeeFamilyDetails WITH (NOLOCK)
      WHERE EmployeeId = @EmployeeID
        AND EmployeeFamilyDetailID = (
          SELECT TOP 1 ChildRowId
          FROM TMyDetailsChangeRequestDetails
          WHERE ChangeRequestId = @LV_ChangeRequestId
        );
                    
      SET @sql = ''                    
       --DECLARE family_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                   
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TEmployeeFamilyDetails' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN family_cursor                        
       --FETCH NEXT FROM family_cursor                        
       --INTO @ChangeRequestId                  
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
       --Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM family_cursor                
       --INTO @ChangeRequestId                    
       --END                       
       --CLOSE family_cursor;                        
       --DEALLOCATE family_cursor;                    
     END                    
                    
        --TEmployeeContactDetails Insert New                    
    IF(Select Count(1) From TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                     
    Where TableName = 'TEmployeeContactDetails' And  IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
    AND TR.ChangeRequestId = @LV_ChangeRequestId) > 0                    
    BEGIN                    
                        
     if not exists (select top 1 1 from TEmployeeContactDetails where employeeid = @EmployeeId)                    
     BEGIN                    
     DECLARE contact_cursor CURSOR FOR                         
     SELECT Distinct TR.ChangeRequestId From                    
   TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                     
     WHERE TD.TableName = 'TEmployeeContactDetails' And                    
       TD.TextValueNew IS NOT NULL And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
     AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                     
     OPEN contact_cursor                    
                      
     FETCH NEXT FROM contact_cursor                         
     INTO @ChangeRequestId                    
                      
     WHILE @@FETCH_STATUS = 0                        
     BEGIN                     
                    
     SELECT @sql = 'INSERT INTO TEmployeeContactDetails ( [EmployeeID],[IsSubmit],[CreatedBy],[CreatedDate],[CreatedDateUtc],[UpdatedDateUtc],' +                    
     STUFF ((                    
      SELECT ', [' + TD.DBFieldName + ']'                    
         FROM sys.columns c INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
         INNER JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                     
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id AND s.name IN ('dbo')                    
      WHERE t.name = 'TEmployeeContactDetails' AND TD.TableName = 'TEmployeeContactDetails' AND y.name NOT IN ('sysname') AND                     
       TD.IsNew = 1 And TD.TextValueNew IS NOT NULL And IsApproved IS NULL And TR.EmployeeId = @EmployeeId And TD.ChangeRequestId = @ChangeRequestId                    
        Order by ChangeDetailsId                    
      FOR XML PATH('')), 1, 1, '') +                    
     ') VALUES ('+Cast(@EmployeeId As varchar)+',1,'+Cast(@EmployeeId As varchar)+',GETDATE(),GETUTCDATE(),GETUTCDATE(),' +                    
     STUFF ((                    
      SELECT ',' + case when y.name IN ('varchar', 'nvarchar', 'char', 'nchar','datetime','date','varbinary') then ''''+TD.TextValueNew+''''         
         else TD.TextValueNew end                    
      FROM sys.columns c INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
         JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                     
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id AND s.name IN ('dbo')                    
      WHERE t.name = 'TEmployeeContactDetails' AND TD.TableName = 'TEmployeeContactDetails' AND y.name NOT IN ('sysname') AND                     
       TD.IsNew = 1 And TD.TextValueNew IS NOT NULL And IsApproved IS NULL And TR.EmployeeId = @EmployeeId And TD.ChangeRequestId = @ChangeRequestId                    
        Order by ChangeDetailsId                    
      FOR XML PATH('')), 1, 1, '') + ')'                    
     exec sp_executesql @sql;            
     SET @sql = ''                    
                    
     IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                     
                    
     FETCH NEXT FROM contact_cursor                         
     INTO @ChangeRequestId                    
                       
     END                         
     CLOSE contact_cursor;                        
     DEALLOCATE contact_cursor;                    
     END                    
    END                    
                    
    --TEmployeeContactDetails Update                    
                        
    IF(Select Count(1) From TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                     
    Where TableName = 'TEmployeeContactDetails' And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
    AND TR.ChangeRequestId = @LV_ChangeRequestId) > 0                    
    BEGIN                    
    if exists (select top 1 1 from TEmployeeContactDetails where employeeid = @EmployeeId)                    
     BEGIN                    
                
   INSERT INTO dbo.[TEmployeeContactDetailsHistory]                
  (EmployeeContactDetailID,EmployeeID,HomeTelephone,                
  WorkEmail,WorkMobileNo,PersonalEmail,WorkTelephone,PersonalMobileNo,ExtensionNo,PayLocation1,                
  PayLocation2,FaxNumber,IsSubmit,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,                
  PersonalMobileNo_Encrypted,PersonalEmail_Encrypted,LastmodifiedOn,CreatedDateUtc,UpdatedDateUtc                
  )                
  select EmployeeContactDetailID,EmployeeID,HomeTelephone,                
  WorkEmail,WorkMobileNo,PersonalEmail,WorkTelephone,PersonalMobileNo,ExtensionNo,PayLocation1,                
  PayLocation2,FaxNumber,IsSubmit,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,                
  null,null,GetDate(),CreatedDateUtc,UpdatedDateUtc from TEmployeeContactDetails WITH(NOLOCK)                
  WHERE EmployeeId = @EmployeeID                  
                 
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                  
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'       
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                   
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ' , UpdatedDate = GETDATE(),UpdatedDateUtc=GETUTCDATE(),UpdatedBy='+Cast(@EmployeeId As varchar(100))+' Where EmployeeId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'              
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeContactDetails'              
       AND TR.TableName = 'TEmployeeContactDetails'                    
AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                    
                    
      SET @sql = ''                    
       --DECLARE contact_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                    
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TEmployeeContactDetails' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN contact_cursor                        
       --FETCH NEXT FROM contact_cursor                        
       --INTO @ChangeRequestId                    
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
--Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
       --Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM contact_cursor                        
       --INTO @ChangeRequestId                    
       --END                        
       --CLOSE contact_cursor;                        
       --DEALLOCATE contact_cursor;                    
     END                    
    END                    
                    
                    
     --TEmployeeEmergencyContactDetails Insert New                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeEmergencyContactDetails'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE emergency_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeeEmergencyContactDetails'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN emergency_cursor                    
                    
      FETCH NEXT                    
      FROM emergency_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TEmployeeEmergencyContactDetails ( [EmployeeID],[IsSubmit],[CreatedBy],[CreatedDate],[UpdatedDateUtcTime],[UpdatedBy],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                 
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id              
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
          AND s.name IN ('dbo')                    
WHERE t.name = 'TEmployeeEmergencyContactDetails'                    
           AND TD.TableName = 'TEmployeeEmergencyContactDetails'                    
 AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',1,' + Cast(@EmployeeId AS VARCHAR) + ',GETDATE(),GETUTCDATE(),'+ Cast(@EmployeeId AS VARCHAR) +',' + STUFF((                    
          SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
THEN TD.TextValueNew                    
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
              THEN '''' + REPLACE(TD.TextValueNew, '''', '''''') + ''''                
    ELSE REPLACE(TD.TextValueNew, '''', '''''')                
            END                    
  FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeEmergencyContactDetails'                    
           AND TD.TableName = 'TEmployeeEmergencyContactDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ') ;                
    set @id=scope_identity();             
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@EmergencyDetailID OUTPUT;                 
      INSERT INTO dbo.TEmployeeEmergencyContactDetailsHistory                
    (                
        EmergencyContactID,EmployeeID,EmergencyContactName,Relation,EmergencyContactAddress,ContactWorkPhone,                
  ContactHomePhone,EmergencyMobile,ContactZipCode,PhysicianName,PhysicianAddress,PhysicianPhone,                
  PhysicianZipCode,IsSubmit,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,EffectiveDate,UpdatedDateUtcTime                
    )                
    SELECT                 
     EmergencyContactID,EmployeeID,EmergencyContactName,Relation,EmergencyContactAddress,ContactWorkPhone,                
  ContactHomePhone,EmergencyMobile,ContactZipCode,PhysicianName,PhysicianAddress,PhysicianPhone,                
  PhysicianZipCode,IsSubmit,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,EffectiveDate,
  ISNULL(UpdatedDateUtcTime, GETUTCDATE())                
    FROM                
        dbo.TEmployeeEmergencyContactDetails                
    WHERE                 
        EmergencyContactID = @EmergencyDetailID ;                
       SET @sql = ''                    
       UPDATE TMyDetailsChangeRequestDetails
       SET CustDetailId = @EmergencyDetailID
       WHERE ChangeRequestId = @ChangeRequestId
         AND TableName = 'TEmployeeEmergencyContactDetails'
         AND IsNew = 1;                
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       FETCH NEXT                    
       FROM emergency_cursor                    
       INTO @ChangeRequestId                    
      END                  
                    
      CLOSE emergency_cursor;               
                    
DEALLOCATE emergency_cursor;                    
     END                    
                    
  --TEmployeeEmergencyContactDetails Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeEmergencyContactDetails'                    
        AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
   ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                    
         THEN '''' + REPLACE(TR.TextValueNew, '''', '''''') + ''''                
    ELSE REPLACE(TR.TextValueNew, '''', '''''')                
        END + ' , UpdatedDate = GETDATE(), UpdatedDateUtcTime = GetUtcDate(),UpdatedBy='+ Cast(@EmployeeId AS VARCHAR) +'  Where EmergencyContactID= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeEmergencyContactDetails'                    
       AND TR.TableName = 'TEmployeeEmergencyContactDetails'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                    
    INSERT INTO dbo.TEmployeeEmergencyContactDetailsHistory                
    (                
        EmergencyContactID,EmployeeID,EmergencyContactName,Relation,EmergencyContactAddress,ContactWorkPhone,                
  ContactHomePhone,EmergencyMobile,ContactZipCode,PhysicianName,PhysicianAddress,PhysicianPhone,                
  PhysicianZipCode,IsSubmit,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,EffectiveDate,UpdatedDateUtcTime                
    )                
    SELECT                 
     EmergencyContactID,EmployeeID,EmergencyContactName,Relation,EmergencyContactAddress,ContactWorkPhone,                
  ContactHomePhone,EmergencyMobile,ContactZipCode,PhysicianName,PhysicianAddress,PhysicianPhone,                
  PhysicianZipCode,IsSubmit,CreatedBy,CreatedDate,UpdatedBy,UpdatedDate,EffectiveDate,
  ISNULL(UpdatedDateUtcTime, GETUTCDATE())                
    FROM                
        dbo.TEmployeeEmergencyContactDetails                
    WHERE                 
        EmergencyContactID = (Select top 1  ChildRowId from TMyDetailsChangeRequestDetails Where ChangeRequestId = @LV_ChangeRequestId ) ;                
      SET @sql = ''                    
       --DECLARE emergency_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                    
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TEmployeeEmergencyContactDetails' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN emergency_cursor                        
       --FETCH NEXT FROM emergency_cursor                        
       --INTO @ChangeRequestId                    
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
--Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM emergency_cursor                        
    --INTO @ChangeRequestId                    
       --END                        
   --CLOSE emergency_cursor;                        
       --DEALLOCATE emergency_cursor;                    
     END                    
                    
     --TEmployeePassportDetails Insert/Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeePassportDetails'      
        AND IsNew  IN( 1,0)                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
                    
       SELECT * INTO #TEmployeePassportDetails                     
       FROM TEmployeePassportDetails                    
       WHERE EmployeeId = @EmployeeId     -- =========== #57912                    
                    
      DECLARE passport_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeePassportDetails'                    
       AND TD.IsNew   IN( 1,0)                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                  
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN passport_cursor                    
                    
      FETCH NEXT                    
      FROM passport_cursor                    
      INTO @ChangeRequestId                 
                   
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
                    
    SELECT @CreatedBy = CreatedBy                    
       FROM TMyDetailsChangeRequests                    
       WHERE ChangeRequestId = @ChangeRequestId;                
                           
       DELETE                    
    FROM TEmployeePassportDetails                    
       WHERE EmployeeId = @EmployeeId                    
                    
       SELECT @sql = 'INSERT INTO TEmployeePassportDetails ( [EmployeeID],[LastUpdatedBy],[LastUpdatedOn],[LastUpdatedOnUtcTime],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                              INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
         AND s.name IN ('dbo')                    
      WHERE t.name = 'TEmployeePassportDetails'                    
           AND TD.TableName = 'TEmployeePassportDetails'                    
           AND y.name NOT IN ('sysname')                    
   AND TD.IsNew   IN( 1,0)                     
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                   
           AND TR.ChangeRequestId = @LV_ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          --), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',' + Cast(@LoggedInUser AS VARCHAR) + ',GETDATE(),GetUtcDate(),' + 'UpdatedBy = ' + CAST(@CreatedBy AS VARCHAR(20)) + ' ,' + STUFF((                    
            ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',' + Cast(@LoggedInUser AS VARCHAR) + ',GETDATE(),GetUtcDate()' + ' ,' + STUFF((                    
         SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                 
              ,'datetime'                    
              ,'date'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
   INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeePassportDetails'                    
           AND TD.TableName = 'TEmployeePassportDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew   IN( 1,0)                     
     AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
 AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
           AND TR.ChangeRequestId = @LV_ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ')' ;                  
            
       EXEC sp_executesql @sql;                    
                    
                           
       SET @sql = ''                    
                    
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )          
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       -- =========== #57912 ======================                    
       UPDATE TEPD                    
               SET TEPD.ExpiryDate = ISNULL( TEPD.ExpiryDate              ,T.ExpiryDate)                    
          ,TEPD.PassportNo = ISNULL( TEPD.PassportNo              ,T.PassportNo)                    
          ,TEPD.ECNR = ISNULL( TEPD.ECNR                   , T.ECNR)                    
          ,TEPD.IssuePlace = ISNULL( TEPD.IssuePlace        ,      T.IssuePlace)                    
          ,TEPD.IssueDate = ISNULL( TEPD.IssueDate          ,     T.IssueDate)                    
          ,TEPD.LastUpdatedBy = @CreatedBy                    
          ,TEPD.LastUpdatedOn = GETDATE()                
          ,TEPD.EffectiveDate = ISNULL( TEPD.EffectiveDate  ,         T.EffectiveDate)                    
          ,TEPD.LastUpdatedOnUtcTime = GetUtcDate()                 
          ,TEPD.PassportName_Encrypted = ISNULL( TEPD.PassportName_Encrypted  ,T.PassportName_Encrypted)                    
          ,TEPD.PassportName = ISNULL( TEPD.PassportName , T.PassportName)                    
       FROM #TEmployeePassportDetails T                    
       JOIN TEmployeePassportDetails TEPD                     
       ON T.EmployeeId = TEPD.EmployeeId                    
       -- AND  T.ID = TEPD.Id                     
       -- =========== #57912 ======================                    

       INSERT INTO dbo.TEmployeePassportDetailsHistory
       (
        EmployeeId,ExpiryDate,PassportNo,ECNR,IssuePlace,IssueDate,
        LastUpdatedBy,LastUpdatedOn,EffectiveDate,LastUpdatedOnUtcTime,
        PassportName_Encrypted,PassportName,Attachment
       )
       SELECT EmployeeId,ExpiryDate,PassportNo,ECNR,IssuePlace,IssueDate,
        LastUpdatedBy,LastUpdatedOn,EffectiveDate,LastUpdatedOnUtcTime,
        PassportName_Encrypted,PassportName,Attachment
       FROM dbo.TEmployeePassportDetails WITH (NOLOCK)
       WHERE EmployeeId = @EmployeeId;
                    
       FETCH NEXT                    
       FROM passport_cursor                    
    INTO @ChangeRequestId                    
      END                    
                    
      CLOSE passport_cursor;                    
                    
      DEALLOCATE passport_cursor;                    
     END                    
                    
     --TEmployeeVisaInfo Insert New                    
     IF (         SELECT Count(1)                    
    FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeVisaInfo'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE visa_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeeVisaInfo'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN visa_cursor                    
                    
      FETCH NEXT                    
      FROM visa_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TEmployeeVisaInfo ( [EmployeeID],[CreatedDate],[CreatedDateUtcTime],[ModifiedDateUtcTime],[ModifiedBy],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                 
          FROM sys.columns c            
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
         JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeVisaInfo'                    
           AND TD.TableName = 'TEmployeeVisaInfo'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',GETDATE(),GETUTCDATE(),GETUTCDATE(),'+ Cast(@EmployeeId AS VARCHAR) +',' + STUFF((                    
          SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                   
     ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c     
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeVisaInfo'                    
       AND TD.TableName = 'TEmployeeVisaInfo'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ');                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@VisaID OUTPUT;                    
   INSERT INTO dbo.TEmployeeVisaInfoHistory                
    (                
        VisaId, EmployeeId, VisaType, VisaNumber, IssueDate, ExpiryDate, Country, Effectivedate, ModifiedBy, ModifiedDate, ModifiedDateUtcTime)                
    SELECT                 
        VisaId, EmployeeId, VisaType, VisaNumber, IssueDate, ExpiryDate, Country, Effectivedate, ModifiedBy, ModifiedDate, ModifiedDateUtcTime                
    FROM                 
        dbo.TEmployeeVisaInfo                
    WHERE  VisaId = @VisaID ;                
       SET @sql = ''                    
       Update TMyDetailsChangeRequestDetails set CustDetailId=@VisaID where CustDetailId=@LV_ChangeRequestId                
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                     
                    
       FETCH NEXT                    
       FROM visa_cursor                    
 INTO @ChangeRequestId                    
      END                    
                    
      CLOSE visa_cursor;                    
                    
      DEALLOCATE visa_cursor;                    
     END                    
                    
     --TEmployeeVisaInfo Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeVisaInfo'                    
        AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                   
    SELECT @CreatedBy = CreatedBy                    
       FROM TMyDetailsChangeRequests                    
WHERE ChangeRequestId = @ChangeRequestId;                
                
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE             
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                    
THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ', ModifiedDate = GETDATE(),ModifiedDateUtcTime = GetUtcDate(),CreatedBy='+Cast(@CreatedBy AS VARCHAR)+',ModifiedBy='+Cast(@CreatedBy AS VARCHAR)+'  Where VisaId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                  
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeVisaInfo'                    
       AND TR.TableName = 'TEmployeeVisaInfo'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
     EXEC sp_executesql @sql;                
                   
     INSERT INTO dbo.TEmployeeVisaInfoHistory                
    (                
        VisaId, EmployeeId, VisaType, VisaNumber, IssueDate, ExpiryDate, Country, Effectivedate, ModifiedBy, ModifiedDate, ModifiedDateUtcTime)                
    SELECT                 
        VisaId, EmployeeId, VisaType, VisaNumber, IssueDate, ExpiryDate, Country, Effectivedate, ModifiedBy, ModifiedDate, ModifiedDateUtcTime                
    FROM        
        dbo.TEmployeeVisaInfo                
    WHERE  VisaId = (Select top 1 ChildRowId from TMyDetailsChangeRequestDetails where ChangeRequestId = @LV_ChangeRequestId);                
                    
      SET @sql = ''                    
       --DECLARE visa_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                    
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TEmployeeVisaInfo' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN visa_cursor                        
       --FETCH NEXT FROM visa_cursor                        
       --INTO @ChangeRequestId                    
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
       --Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM visa_cursor                        
       --INTO @ChangeRequestId                    
       --END                        
       --CLOSE visa_cursor;                        
       --DEALLOCATE visa_cursor;                    
     END                    
                    
     --TEmployeeNomination Insert New                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                  
       WHERE TableName = 'TEmployeeNomination'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                 
     AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE nomination_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
     FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeeNomination'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
 AND TR.EmployeeId = @EmployeeId                 
       AND TR.ChangeRequestId = @LV_ChangeRequestId                  
                    
      OPEN nomination_cursor                    
                    
      FETCH NEXT                    
      FROM nomination_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TEmployeeNomination ( [EmployeeID],[CreatedDate],[Gender],[IsDelete],[CreatedDateUtc],[UpdatedDateUtc],[UpdatedBy],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c    INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
  JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeNomination'                    
           AND TD.TableName = 'TEmployeeNomination'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',GETDATE(),0,0,GETUTCDATE(),GETUTCDATE(),'+Cast(@EmployeeId as varchar(50)) + ','+STUFF((                    
          SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + REPLACE(TD.TextValueNew,'''','''''') + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
      AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeNomination'                    
           AND TD.TableName = 'TEmployeeNomination'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ');                
                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@NominationID OUTPUT;                    

       IF @NominationID IS NOT NULL
       BEGIN
        INSERT INTO dbo.[TEmployeeNominationHistory]
        (
        EmployeeID,Category,Value,Relationship,Name,DOB,Gender,
        EmployeeNominationId,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
        UpdatedDate,NomineeAddress,NomineeGender,NomineeContactNo,
        NomineeEmailID,NomineeQualification,NomineeRemarks,
        IsMinor,NomineeGuardianName,NomineeGuardianAddress,NomineeGuardianRelwithNominee,
        NomineeGuardianContactNumber, LastModifiedOn,CreatedDateUtc,UpdatedDateUtc
        )
        SELECT EmployeeID,Category,Value,Relationship,Name,ISNULL(DOB,''),Gender,
        EmployeeNominationId,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
        UpdatedDate,NomineeAddress,NomineeGender,NomineeContactNo,
        NomineeEmailID,NomineeQualification,NomineeRemarks,
        IsMinor,NomineeGuardianName,NomineeGuardianAddress,NomineeGuardianRelwithNominee,
        NomineeGuardianContactNumber, GETDATE(),CreatedDateUtc,UpdatedDateUtc
        FROM dbo.TEmployeeNomination WITH (NOLOCK)
        WHERE EmployeeNominationId = @NominationID;
       END
                    
       SET @sql = ''                    
      UPDATE TMyDetailsChangeRequestDetails set CustDetailId=@NominationID where CustDetailId=@LV_ChangeRequestId                
                
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       FETCH NEXT                    
       FROM nomination_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE nomination_cursor;                  
                    
      DEALLOCATE nomination_cursor;                    
     END                    
                    
     --TEmployeeNomination Update                    
     IF (                    
       SELECT Count(1)                  
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeNomination'                    
        AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                 
 AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                   
BEGIN                    
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                    
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ', UpdatedDate = GETDATE(),UpdatedDateUtc=GETUTCDATE(),UpdatedBy='+Cast(@EmployeeID AS VARCHAR(50))+' Where EmployeeNominationId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                   
       AND s.name IN ('dbo')                    
    INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeNomination'                    
       AND TR.TableName = 'TEmployeeNomination'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;

      -- After-apply snapshot so history-only Past History sees the new values.
      INSERT INTO dbo.[TEmployeeNominationHistory]
      (EmployeeID,Category,Value,Relationship,Name,DOB,Gender,
      EmployeeNominationId,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
      UpdatedDate,NomineeAddress,NomineeGender,NomineeContactNo
      ,NomineeEmailID,NomineeQualification,NomineeRemarks
      ,IsMinor,NomineeGuardianName,NomineeGuardianAddress,NomineeGuardianRelwithNominee
      ,NomineeGuardianContactNumber, LastModifiedOn,CreatedDateUtc,UpdatedDateUtc
      )
      SELECT EmployeeID,Category,Value,Relationship,Name,ISNULL(DOB,''),Gender,
      EmployeeNominationId,IsDelete,CreatedBy,CreatedDate,UpdatedBy,
      UpdatedDate,NomineeAddress,NomineeGender,NomineeContactNo
      ,NomineeEmailID,NomineeQualification,NomineeRemarks
      ,IsMinor,NomineeGuardianName,NomineeGuardianAddress,NomineeGuardianRelwithNominee
      ,NomineeGuardianContactNumber, GETDATE(),CreatedDateUtc,UpdatedDateUtc
      FROM dbo.TEmployeeNomination WITH (NOLOCK)
      WHERE EmployeeId = @EmployeeID
        AND (
          EmployeeNominationId = (
            SELECT TOP 1 ChildRowId
            FROM TMyDetailsChangeRequestDetails
            WHERE ChangeRequestId = @LV_ChangeRequestId
          )
          OR EmployeeFamilyDetailID = (
            SELECT TOP 1 ChildRowId
            FROM TMyDetailsChangeRequestDetails
            WHERE ChangeRequestId = @LV_ChangeRequestId
          )
        );
                    
      SET @sql = ''                    
       --DECLARE nomination_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                    
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TEmployeeNomination' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN nomination_cursor                        
       --FETCH NEXT FROM nomination_cursor                        
       --INTO @ChangeRequestId                    
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                  
       --Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM nomination_cursor                        
       --INTO @ChangeRequestId                    
       --END                        
       --CLOSE nomination_cursor;                        
       --DEALLOCATE nomination_cursor;                    
     END                    
                    
     --TEmployeeBankDetails Insert New                    
--     IF (                    
--       SELECT Count(1)                    
--       FROM TMyDetailsChangeRequestDetails TD                    
--       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
--       WHERE TableName = 'TEmployeeBankDetails'                    
--        AND IsNew = 1                    
--        AND IsApproved IS NULL                    
--        AND TR.EmployeeId = @EmployeeId                    
--        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
--       ) > 0                    
--     BEGIN                    
--  IF  (select count(1) from tcustomersettings where employerid=@EmployerId and IsmultiplePayrollallowed=0)>1                
--  and (Select count(1) from TEmployeeBankDetails where Employeeid=@EmployeeId and show=1 and Payroll=1)>=1                
--  and (Select count(1) from TMyDetailsChangeRequestDetails TD                    
--      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId where TD.TableName = 'TEmployeeBankDetails' and                
--      TR.EmployeeId = @EmployeeId and TD.ChangeRequestId = @LV_ChangeRequestId and TD.FieldName='Payroll' and TD.NewValue='Y' )>0                
--     BEGIN                
--  RAISERROR('Multiple Payroll Accounts are now allowed', 16, 1)                
--  END                
            
--      DECLARE bank_cursor CURSOR                    
--      FOR                    
--      SELECT DISTINCT TR.ChangeRequestId                    
--      FROM TMyDetailsChangeRequestDetails TD                    
--      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
--      WHERE TD.TableName = 'TEmployeeBankDetails'                    
--       AND TD.IsNew = 1                    
--       AND TD.TextValueNew IS NOT NULL                    
--       AND IsApproved IS NULL                    
--       AND TR.EmployeeId = @EmployeeId                    
--       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
--      OPEN bank_cursor                    
                    
--      FETCH NEXT                    
--      FROM bank_cursor                   
--      INTO @ChangeRequestId                    
                    
--      WHILE @@FETCH_STATUS = 0                    
--      BEGIN                    
--       ----UPDATE TEmployeeBankDetails                    
--       ----SET Show = 1                    
--       ----WHERE EmployeeId = @EmployeeId                 
--       ----UPDATE TEmployeeBankDetails_History                    
--       ----SET Show = 1                    
--       ----WHERE EmployeeId = @EmployeeId             
--    ----------------------------------------------------            
                
--    Insert Into TEmployeeBankDetails (EmployeeId, BankName, BankAddress, BranchName, ContactPerson,AccountNo,                 
--    Payroll, SortCode, IBAN, AccountType, BIC, LastUpdatedBy, LastUpdatedOn, BranchCode,Id,Show,isDefault,            
--    EmpNameAsPerBankRecords,UpdatedDateUtc,CreatedDateUtc)                
--    Values(@EmployeeId, @BankName, @BankAddress, @BranchName, @ContactPerson,                
--    @AccountNo,@Payroll, @SortCode, @IBAN, @AccountType, @BIC, @LastUpdatedBy, GetDate(),             
--    @BranchCode,@Id,@Show,@isDefault,@EmpNameAsPerBankRecords,GETUTCDATE(),GETUTCDATE())                
                    
--    Set @BankDetailId  = Scope_Identity();                 
--   INSERT INTO dbo.TEmployeeBankDetails_History                
--   (                
--    BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,                
--    BranchName,ContactPerson,EmpNameAsPerBankRecords,                
--    AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,                
--    LastUpdatedOn,BranchCode,ID,Show,AccountNo_Encrypted,isDefault,CreatedDateUtc,UpdatedDateUtc                
--   )                
--   SELECT                 
--    BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,                
--    BranchName,ContactPerson,EmpNameAsPerBankRecords,                
--    AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,                
--    LastUpdatedOn,BranchCode,ID,Show,null,isDefault,CreatedDateUtc,UpdatedDateUtc                
--   FROM                 
--    dbo.TEmployeeBankDetails                
--   WHERE                 
--     BankDetailId = @BankDetailId ;              
--       ----------------------------------------------------             
-- IF NOT EXISTS (SELECT Count(1)                    
--       FROM TMyDetailsChangeRequestDetails TD                    
--       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
--       WHERE TableName = 'TEmployeeDetailCustomFields'                    
--        AND IsNew = 1                    
--        AND IsApproved IS NULL                    
--        AND TR.EmployeeId = @EmployeeId                    
--        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
--  BEGIN                
--       UPDATE TMyDetailsChangeRequests                    
--       SET IsApproved = 1                    
--        ,Comments = @Comments                    
--       WHERE ChangeRequestId = @ChangeRequestId                    
--        AND ChangeRequestId = @LV_ChangeRequestId                    
--      END                      
                    
--       FETCH NEXT                    
--       FROM bank_cursor                    
--       INTO @ChangeRequestId                    
--      END                    
                    
--      CLOSE bank_cursor;                    
                    
-- DEALLOCATE bank_cursor;                    
--     END                    
                    
--     --TEmployeeBankDetails Update                    
--     IF (                    
--       SELECT Count(1)                    
--       FROM TMyDetailsChangeRequestDetails TD                    
--       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
--       WHERE TableName = 'TEmployeeBankDetails'                    
--        AND IsNew = 0                    
--        AND IsApproved IS NULL                    
--        AND TR.EmployeeId = @EmployeeId                    
--        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
--       ) > 0                    
--     BEGIN                    
--      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
--        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
--         THEN TR.TextValueNew                    
--        WHEN y.name IN (                    
--          'varchar'                    
--          ,'nvarchar'                    
--          ,'char'                    
--          ,'nchar'                    
--          ,'datetime'                    
--          ,'date'                    
--          ,'varbinary'                    
--          )                    
--         THEN '''' + TR.TextValueNew + ''''                    
--ELSE TR.TextValueNew                    
--        END + ', LastUpdatedOn = GETDATE(),UpdatedDateUtc=GETUTCDATE(),LastUpdatedBy='+CAST(@EmployeeId as VARCHAR(50))+' Where BankDetailId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
--      FROM sys.columns c                    
--      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
--      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
--       AND s.name IN ('dbo')                    
--      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
--      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
--      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
--      WHERE t.name = 'TEmployeeBankDetails'                    
--       AND TR.TableName = 'TEmployeeBankDetails'                    
--       AND TR.IsNew = 0                    
--       AND y.name NOT IN ('sysname')                    
--       AND TR.TextValueNew IS NOT NULL                    
--       AND IsApproved IS NULL                    
--    AND TD.EmployeeId = @EmployeeId                    
--       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
--   --------------------------------------------              
-- --Added On 02 sep 2026              
-- -- Change requests store BranchCode only. Resolve TBankBranchDetails.ID from the              
--      -- approved BankIdentifier so TEmployeeBankDetails.ID is updated with BranchCode.              
--      DECLARE @lvBranchDetailId INT              
--      DECLARE @lvBranchCodeValue NVARCHAR(500)              
--      DECLARE @lvBankDetailId INT              
               
--      SELECT TOP 1              
--        @lvBranchCodeValue = TR.TextValueNew              
--        ,@lvBankDetailId = TR.ChildRowId              
--      FROM TMyDetailsChangeRequestDetails TR              
--      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId              
--      WHERE TR.TableName = 'TEmployeeBankDetails'              
--        AND TR.IsNew = 0              
--        AND TR.DBFieldName = 'BranchCode'              
--        AND TR.TextValueNew IS NOT NULL              
--        AND IsApproved IS NULL              
--        AND TD.EmployeeId = @EmployeeId              
--        AND TR.ChangeRequestId = @LV_ChangeRequestId              
               
--      IF @lvBranchCodeValue IS NOT NULL              
--      BEGIN              
--        SET @lvBranchDetailId = NULL              
               
--        SELECT TOP 1 @lvBranchDetailId = ID              
--        FROM dbo.TBankBranchDetails              
--        WHERE UPPER(LTRIM(RTRIM(BankIdentifier))) = UPPER(LTRIM(RTRIM(@lvBranchCodeValue)))              
--          AND Employerid = @EmployerId              
--          AND IsActive = 'Y'              
               
--        IF @lvBranchDetailId IS NOT NULL              
--        BEGIN              
--          SET @sql = @sql + ' UPDATE TEmployeeBankDetails SET ID = ' + CAST(@lvBranchDetailId AS VARCHAR(20))              
--            + ' WHERE BankDetailId = ' + CAST(@lvBankDetailId AS VARCHAR(20)) + ';'              
--        END              
--      END              
              
-- -----------------------------------------------              
                  
--      EXEC sp_executesql @sql;                 
                 
--    INSERT INTO dbo.TEmployeeBankDetails_History                
--    (                
--        BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,                
--  BranchName,ContactPerson,EmpNameAsPerBankRecords,                
--        AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,                
--  LastUpdatedOn,BranchCode,ID,Show,AccountNo_Encrypted,isDefault,CreatedDateUtc,UpdatedDateUtc                
--    )                
--    SELECT                 
--     BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,                
--  BranchName,ContactPerson,EmpNameAsPerBankRecords,                
--        AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,                
--  LastUpdatedOn,BranchCode,ID,Show,null,isDefault,CreatedDateUtc,UpdatedDateUtc                
--    FROM                 
--        dbo.TEmployeeBankDetails                
--    WHERE                 
--         BankDetailId = (Select top 1 ChildRowId from TMyDetailsChangeRequestDetails where ChangeRequestId = @LV_ChangeRequestId);                
--      SET @sql = ''                    
--       --DECLARE bank_cursor CURSOR FOR                        
--       --SELECT Distinct TR.ChangeRequestId From                    
--       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
--       --WHERE TD.TableName = 'TEmployeeBankDetails' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
--       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
--       --OPEN bank_cursor                        
--       --FETCH NEXT FROM bank_cursor                        
--       --INTO @ChangeRequestId                  
--       --WHILE @@FETCH_STATUS = 0                        
--       --BEGIN                    
--       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
--       --Where ChangeRequestId = @ChangeRequestId                    
--       --AND ChangeRequestId = @LV_ChangeRequestId                    
--       --FETCH NEXT FROM bank_cursor                        
--       --INTO @ChangeRequestId                    
--       --END                        
--       --CLOSE bank_cursor;                        
--       --DEALLOCATE bank_cursor;                    
--     END              
 IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeBankDetails'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE Bank_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
     FROM TMyDetailsChangeRequestDetails TD                    
      INNER JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeeBankDetails'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN Bank_cursor                    
                    
      FETCH NEXT                    
      FROM Bank_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TEmployeeBankDetails ( [EmployeeID],[IsDelete],[show],[LastUpdatedOn],[LastUpdatedBy],[CreatedDateUtc],[UpdatedDateUtc],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeBankDetails'                    
           AND TD.TableName = 'TEmployeeBankDetails'                    
           AND y.name NOT IN ('sysname')                   
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ')            
    VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',NULL,1,GETDATE(),'+Cast(@EmployeeId As varchar(100))+',GETUTCDATE(),GETUTCDATE(),' + STUFF((                    
          SELECT ',' + CASE                     
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id            
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeBankDetails'                    
           AND TD.TableName = 'TEmployeeBankDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                 
          ), 1, 1, '') + ');                
                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@BankDetailID OUTPUT;                   
                
       SET @sql = ''             
            
    -- Resolve TBankBranchDetails.ID from the BankIdentifier (BranchCode) submitted with this            
       -- new bank record, and set the newly-inserted row's ID column to that resolved value.            
       --UPDATE TEBD            
       --SET TEBD.ID = BBD.ID            
       --FROM dbo.TEmployeeBankDetails TEBD            
       --CROSS APPLY (            
       --    SELECT TOP 1 TD.TextValueNew AS BranchCodeValue            
       --    FROM TMyDetailsChangeRequestDetails TD            
       --    JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId            
       --    WHERE TD.TableName = 'TEmployeeBankDetails'            
       --      AND TD.IsNew = 1            
       --      AND TD.DBFieldName = 'BranchCode'            
       --      AND TD.TextValueNew IS NOT NULL            
       --      AND TR.IsApproved IS NULL            
       --      AND TR.EmployeeId = @EmployeeId            
       --      AND TD.ChangeRequestId = @ChangeRequestId            
       --) SubmittedBranch            
       --JOIN dbo.TBankBranchDetails BBD            
       --  ON UPPER(LTRIM(RTRIM(BBD.BankIdentifier))) = UPPER(LTRIM(RTRIM(SubmittedBranch.BranchCodeValue)))            
       -- AND BBD.Employerid = @EmployerId            
       -- AND BBD.IsActive = 'Y'            
       --WHERE TEBD.BankDetailId = @BankDetailID;            
            
    UPDATE TEBD  
       SET TEBD.ID = BBD.ID  
    FROM dbo.TEmployeeBankDetails TEBD  
       CROSS APPLY (  
           SELECT TOP 1  
               TD.TextValueNew AS BranchCodeValue,  
               BN.TextValueNew AS BankNameValue  
           FROM TMyDetailsChangeRequestDetails TD  
           JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId  
           LEFT JOIN TMyDetailsChangeRequestDetails BN  
               ON BN.ChangeRequestId = TD.ChangeRequestId  
              AND BN.TableName   = 'TEmployeeBankDetails'  
              AND BN.IsNew       = 1  
              AND BN.DBFieldName = 'BankName'  
              AND BN.TextValueNew IS NOT NULL  
           WHERE TD.TableName = 'TEmployeeBankDetails'  
             AND TD.IsNew = 1  
             AND TD.DBFieldName = 'BranchCode'  
             AND TD.TextValueNew IS NOT NULL  
             AND TR.IsApproved IS NULL  
             AND TR.EmployeeId = @EmployeeId  
             AND TD.ChangeRequestId = @ChangeRequestId  
       ) SubmittedBranch  
    JOIN dbo.TBankBranchDetails BBD   
         ON UPPER(LTRIM(RTRIM(BBD.BankIdentifier))) = UPPER(LTRIM(RTRIM(SubmittedBranch.BranchCodeValue)))  
        AND BBD.Employerid = @EmployerId  
        AND BBD.IsActive = 'Y'  
        JOIN Tbank bnk with (nolock) ON bnk.bankid=BBD.bankid and bnk.Employerid=BBD.Employerid        
        AND (SubmittedBranch.BankNameValue IS NULL OR UPPER(LTRIM(RTRIM(bnk.BankName))) = UPPER(LTRIM(RTRIM(SubmittedBranch.BankNameValue))))  
       WHERE TEBD.BankDetailId = @BankDetailID;  
  
            
       INSERT INTO dbo.TEmployeeBankDetails_History            
       (            
           BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,            
           BranchName,ContactPerson,EmpNameAsPerBankRecords,            
           AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,            
           LastUpdatedOn,BranchCode,ID,Show,AccountNo_Encrypted,isDefault,CreatedDateUtc,UpdatedDateUtc            
     )            
       SELECT            
           BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,            
           BranchName,ContactPerson,EmpNameAsPerBankRecords,            
           AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,            
           LastUpdatedOn,BranchCode,ID,Show,null,isDefault,CreatedDateUtc,UpdatedDateUtc            
       FROM            
           dbo.TEmployeeBankDetails            
       WHERE            
           BankDetailId = @BankDetailId ;            
                
            
    IF EXISTS (Select 1 from TMyDetailsChangeRequestDetails Where CustDetailId=@ChangeRequestId)                
    BEGIN                
       Update TMyDetailsChangeRequestDetails set CustDetailId=@BankDetailID                 
    Where CustDetailId=@ChangeRequestId                
    END                
                
    IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1         
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                   
                    
       FETCH NEXT                    
       FROM Bank_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE Bank_cursor;             
      DEALLOCATE Bank_cursor;                    
     END                    
                    
     --TEmployeeBankDetails Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeBankDetails'                    
        AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                  
                 
  SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                    
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ' ,LastUpdatedOn= GetDate(), UpdatedDateUtc=GETUTCDATE(),LastUpdatedBy='+Cast(@EmployeeId As varchar(100))+            
  '  Where BankDetailID= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeBankDetails'                    
       AND TR.TableName = 'TEmployeeBankDetails'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
               
                       
 --------------------------------------------              
 --Added On 02 sep 2026              
 -- Change requests store BranchCode only. Resolve TBankBranchDetails.ID from the              
      -- approved BankIdentifier so TEmployeeBankDetails.ID is updated with BranchCode.              
     -- DECLARE @lvBranchDetailId INT              
     -- DECLARE @lvBranchCodeValue NVARCHAR(500)              
     --DECLARE @lvBankDetailId INT              
               
     -- SELECT TOP 1              
     --   @lvBranchCodeValue = TR.TextValueNew              
     --   ,@lvBankDetailId = TR.ChildRowId              
     -- FROM TMyDetailsChangeRequestDetails TR              
     -- JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId              
     -- WHERE TR.TableName = 'TEmployeeBankDetails'              
     --   AND TR.IsNew = 0              
     --   AND TR.DBFieldName = 'BranchCode'              
     --   AND TR.TextValueNew IS NOT NULL              
     --   AND IsApproved IS NULL              
     --   AND TD.EmployeeId = @EmployeeId              
     --   AND TR.ChangeRequestId = @LV_ChangeRequestId              
               
     -- IF @lvBranchCodeValue IS NOT NULL              
     -- BEGIN              
     --   SET @lvBranchDetailId = NULL              
               
     --   SELECT TOP 1 @lvBranchDetailId = ID              
     --   FROM dbo.TBankBranchDetails              
     --   WHERE UPPER(LTRIM(RTRIM(BankIdentifier))) = UPPER(LTRIM(RTRIM(@lvBranchCodeValue)))              
     --     AND Employerid = @EmployerId              
     --     AND IsActive = 'Y'              
               
   DECLARE @lvBranchDetailId INT  
      DECLARE @lvBranchCodeValue NVARCHAR(500)  
      DECLARE @lvBankNameValue NVARCHAR(500)  
      DECLARE @lvBankDetailId INT  
  
      SELECT TOP 1  
        @lvBranchCodeValue = TR.TextValueNew  
        ,@lvBankDetailId = TR.ChildRowId  
      FROM TMyDetailsChangeRequestDetails TR  
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId  
      WHERE TR.TableName = 'TEmployeeBankDetails'  
        AND TR.IsNew = 0  
        AND TR.DBFieldName = 'BranchCode'  
        AND TR.TextValueNew IS NOT NULL  
        AND IsApproved IS NULL  
        AND TD.EmployeeId = @EmployeeId  
        AND TR.ChangeRequestId = @LV_ChangeRequestId  
  
      -- NEW: fetch the BankName submitted for the same bank-detail row in this change request  
      SELECT TOP 1  
        @lvBankNameValue = TR.TextValueNew  
      FROM TMyDetailsChangeRequestDetails TR  
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId  
      WHERE TR.TableName = 'TEmployeeBankDetails'  
        AND TR.IsNew = 0  
        AND TR.DBFieldName = 'BankName'  
        AND TR.TextValueNew IS NOT NULL  
        AND IsApproved IS NULL  
        AND TD.EmployeeId = @EmployeeId  
        AND TR.ChangeRequestId = @LV_ChangeRequestId  
        AND TR.ChildRowId = @lvBankDetailId  
  
      IF @lvBranchCodeValue IS NOT NULL  
      BEGIN  
        SET @lvBranchDetailId = NULL  
  
        SELECT TOP 1 @lvBranchDetailId = tbd.ID  
        FROM dbo.TBankBranchDetails tbd  
  JOIN Tbank bnk with (nolock) ON bnk.BankID=tbd.BankID and bnk.Employerid=tbd.Employerid  
        WHERE UPPER(LTRIM(RTRIM(tbd.BankIdentifier))) = UPPER(LTRIM(RTRIM(@lvBranchCodeValue)))  
          AND tbd.Employerid = @EmployerId  
          AND tbd.IsActive = 'Y'  
          AND (@lvBankNameValue IS NULL  
               OR UPPER(LTRIM(RTRIM(bnk.BankName))) = UPPER(LTRIM(RTRIM(@lvBankNameValue))))  
        
  
        IF @lvBranchDetailId IS NOT NULL              
        BEGIN              
          SET @sql = @sql + ' UPDATE TEmployeeBankDetails SET ID = ' + CAST(@lvBranchDetailId AS VARCHAR(20))              
            + ' WHERE BankDetailId = ' + CAST(@lvBankDetailId AS VARCHAR(20)) + ';'              
        END    
    
  SET @lvBankNameValue='';  
      END              
              
 -----------------------------------------------              
                  
      EXEC sp_executesql @sql;                 
                    
   INSERT INTO dbo.TEmployeeBankDetails_History                
  (BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,BranchName,ContactPerson,            
  AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,LastUpdatedOn,BranchCode,ID,Show,            
  isDefault,UpdatedDateUtc,CreatedDateUtc,IsDelete,EmpNameAsPerBankRecords)            
              
  SELECT BankDetailId,EmployeeId,BankName,BankURL,BankAddress,BankPhoneNo,BranchName,ContactPerson,            
  AccountNo,Payroll,SortCode,IBAN,AccountType,BIC,LastUpdatedBy,LastUpdatedOn,BranchCode,ID,Show,            
  isDefault,UpdatedDateUtc,CreatedDateUtc,IsDelete,EmpNameAsPerBankRecords            
  from TEmployeeBankDetails with(nolock)                
  WHERE EmployeeId = @EmployeeID AND                 
  BankDetailId = (Select top 1 ChildRowId from TMyDetailsChangeRequestDetails where ChangeRequestId = @LV_ChangeRequestId)                
               
      SET @sql = ''                      
     END                    
                
                    
     --TCertificationDetails Insert New                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TCertificationDetails'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                   
        AND TR.ChangeRequestId = @LV_ChangeRequestId                  
       ) > 0                    
     BEGIN                    
      DECLARE certification_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                 
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TCertificationDetails'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                
                    
      OPEN certification_cursor                    
                    
      FETCH NEXT                    
      FROM certification_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TCertificationDetails ( [EmployeeId],[ModifiedOn],[UpdatedDateUtc],[CreatedDateUtc],[UpdatedBy],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TCertificationDetails'                    
           AND TD.TableName = 'TCertificationDetails'           
   AND y.name NOT IN ('sysname')                    
     AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
    FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',GETDATE(),GETUTCDATE(),GETUTCDATE(),'+CAST(@EmployeeID as Varchar(50)) +','+ STUFF((                    
          SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
    ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TCertificationDetails'                    
           AND TD.TableName = 'TCertificationDetails'                    
     AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ');                
                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@CertificationID OUTPUT;                    
    INSERT INTO dbo.[TCertificationDetailsHistory]                
  (CertificationDetailId,CertificateId,CertifiedOn,Reference,ExpiryDate,Institution,                
  RenewedOn,SubjectId,Percentage,EmployeeId,ModifiedOn,employerid,UpdatedBy, LastModifiedOn,UpdatedDateUtc,CreatedDateUtc,Isdelete                
  )                
  select  CertificationDetailId,CertificateId,CertifiedOn,Reference,ExpiryDate,Institution,                
  RenewedOn,SubjectId,Percentage,EmployeeId,ModifiedOn,employerid,UpdatedBy, getdate(),UpdatedDateUtc,CreatedDateUtc,Isdelete                
  from TCertificationDetails WITH(NOLOCK)                
  WHERE  CertificationDetailId = @CertificationID                
       SET @sql = ''                    
       UPDATE TMyDetailsChangeRequestDetails set CustDetailId=@CertificationID where CustDetailId=@LV_ChangeRequestId                
                
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL   
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       FETCH NEXT                    
       FROM certification_cursor                    
 INTO @ChangeRequestId                    
      END                    
                    
      CLOSE certification_cursor;                    
                    
      DEALLOCATE certification_cursor;                    
END                    
                    
  --TCertificationDetails Update                    
     IF (           SELECT Count(1)                    
   FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TCertificationDetails'                    
  AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                    
      THEN '''' + TR.TextValueNew + ''''                    
       ELSE TR.TextValueNew                    
        END + ', UpdatedDateUtc=GETUTCDATE(),UpdatedBy='+CAST(@EmployeeID as Varchar(50))+' Where CertificationDetailId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TCertificationDetails'                    
       AND TR.TableName = 'TCertificationDetails'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                
                   
   INSERT INTO dbo.[TCertificationDetailsHistory]                
  (CertificationDetailId,CertificateId,CertifiedOn,Reference,ExpiryDate,Institution,                
  RenewedOn,SubjectId,Percentage,EmployeeId,ModifiedOn,employerid,UpdatedBy, LastModifiedOn,UpdatedDateUtc,CreatedDateUtc,Isdelete                
  )                
  select  CertificationDetailId,CertificateId,CertifiedOn,Reference,ExpiryDate,Institution,                
  RenewedOn,SubjectId,Percentage,EmployeeId,ModifiedOn,employerid,UpdatedBy, getdate(),UpdatedDateUtc,CreatedDateUtc,Isdelete                
  from TCertificationDetails WITH(NOLOCK)                
  WHERE  CertificationDetailId = (Select top 1 ChildRowId from TMyDetailsChangeRequestDetails where ChangeRequestId = @LV_ChangeRequestId);                
                    
      SET @sql = ''                    
       --DECLARE cerification_cursor CURSOR FOR                        
       --SELECT Distinct TR.ChangeRequestId From                    
       --TMyDetailsChangeRequestDetails TD JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       --WHERE TD.TableName = 'TCertificationDetails' And IsNew = 0 And IsApproved IS NULL And TR.EmployeeId = @EmployeeId                    
       --AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       --OPEN cerification_cursor                        
       --FETCH NEXT FROM cerification_cursor                        
       --INTO @ChangeRequestId                    
       --WHILE @@FETCH_STATUS = 0                        
       --BEGIN                    
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
       --Where ChangeRequestId = @ChangeRequestId                    
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       --FETCH NEXT FROM cerification_cursor                        
       --INTO @ChangeRequestId                    
       --END                        
       --CLOSE cerification_cursor;                        
       --DEALLOCATE cerification_cursor;                    
     END                  
                    
     --TEducationDetails Insert New                   
     IF (                 
       SELECT Count(1)                    
   FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEducationDetails'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE education_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEducationDetails'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN education_cursor                    
                    
      FETCH NEXT                    
      FROM education_cursor                    
      INTO @ChangeRequestId                    
                  
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
     SELECT @sql = 'INSERT INTO TEducationDetails ( [EmployeeId],[LastUpdatedOn],[LastUpdatedBy],[UpdatedDateUtc],[CreatedDateUtc],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEducationDetails'                    
           AND TD.TableName = 'TEducationDetails'                    
          AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',GETDATE(),'+CAST(@EmployeeId as varchar(50))+',GETUTCDATE(),GETUTCDATE(),' + STUFF((                    
          SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
            WHEN y.name IN (                    
              'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
         ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
   ELSE TD.TextValueNew                    
 END                    
          FROM sys.columns c                    
   INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEducationDetails'                    
           AND TD.TableName = 'TEducationDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                  ), 1, 1, '') + ');                
                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@EducationID OUTPUT;                    
    INSERT INTO dbo.TEducationHistoryDetails                
  (                
  EducationId,EmployeeId,EstablishmentTypeId,EstablishmentId,AffiliateToId,AttendedFrom,                
  AttendedTo,YearOfPassing,CompanySponsored,Amount,ReimbursementDate,Discipline,LevelId,                
  SubjectId,MajorFieldId,MinorFieldId,Grade,BreakExplanation,LastUpdatedBy,LastUpdatedOn,                
  InstituteAddress,CurrencyId,CPApproval,TotalUnits,UnitsCompleted,DivisionOfficer,BondPeriod,                
  BondAmount,SLLeave,AcquiredQualification,DateOfGraduation,VerificationRemarks, LastModifiedOn,CreatedDateUtc,UpdatedDateUtc,IsDelete                
  )                
  SELECT  EducationId,EmployeeId,EstablishmentTypeId,EstablishmentId,AffiliateToId,AttendedFrom,                
  AttendedTo,YearOfPassing,CompanySponsored,Amount,ReimbursementDate,Discipline,LevelId,SubjectId,                
  MajorFieldId,MinorFieldId,Grade,BreakExplanation,LastUpdatedBy,LastUpdatedOn,InstituteAddress,      
  CurrencyId,CPApproval,TotalUnits,UnitsCompleted,DivisionOfficer,BondPeriod,BondAmount,SLLeave,                
  AcquiredQualification,DateOfGraduation,VerificationRemarks, Getdate(),
  ISNULL(CreatedDateUtc, GETUTCDATE()), ISNULL(UpdatedDateUtc, GETUTCDATE()), IsDelete                
  FROM TEducationDetails WITH(NOLOCK)                
  WHERE  EducationId  = @EducationID                
       SET @sql = ''                    
       UPDATE TMyDetailsChangeRequestDetails
       SET CustDetailId = @EducationID
       WHERE ChangeRequestId = @LV_ChangeRequestId
         AND TableName = 'TEducationDetails'
         AND IsNew = 1;                
                
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       FETCH NEXT                    
       FROM education_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE education_cursor;                    
                    
      DEALLOCATE education_cursor;                    
     END                    
                    
     --TEducationDetails Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEducationDetails'                    
        AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
  WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
      ,'char'                    
      ,'nchar'                   
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                   
          )                    
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ', LastUpdatedOn = GETDATE(),UpdatedDateUtc=GETUTCDATE(),LastUpdatedBy='+CAST(@EmployeeID as Varchar(50))+' Where EducationId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                 
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEducationDetails'                    
       AND TR.TableName = 'TEducationDetails'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                    
    INSERT INTO dbo.TEducationHistoryDetails                
  (                
  EducationId,EmployeeId,EstablishmentTypeId,EstablishmentId,AffiliateToId,AttendedFrom,                
  AttendedTo,YearOfPassing,CompanySponsored,Amount,ReimbursementDate,Discipline,LevelId,         
  SubjectId,MajorFieldId,MinorFieldId,Grade,BreakExplanation,LastUpdatedBy,LastUpdatedOn,                
  InstituteAddress,CurrencyId,CPApproval,TotalUnits,UnitsCompleted,DivisionOfficer,BondPeriod,                
  BondAmount,SLLeave,AcquiredQualification,DateOfGraduation,VerificationRemarks, LastModifiedOn,CreatedDateUtc,UpdatedDateUtc,IsDelete                
  )                
  SELECT  EducationId,EmployeeId,EstablishmentTypeId,EstablishmentId,AffiliateToId,AttendedFrom,                
  AttendedTo,YearOfPassing,CompanySponsored,Amount,ReimbursementDate,Discipline,LevelId,SubjectId,                
  MajorFieldId,MinorFieldId,Grade,BreakExplanation,LastUpdatedBy,LastUpdatedOn,InstituteAddress,                
  CurrencyId,CPApproval,TotalUnits,UnitsCompleted,DivisionOfficer,BondPeriod,BondAmount,SLLeave,                
  AcquiredQualification,DateOfGraduation,VerificationRemarks, Getdate(),
  ISNULL(CreatedDateUtc, GETUTCDATE()), ISNULL(UpdatedDateUtc, GETUTCDATE()), IsDelete                
  FROM TEducationDetails WITH(NOLOCK)                
  WHERE  EducationId  = (Select top 1 ChildRowId from TMyDetailsChangeRequestDetails where ChangeRequestId = @LV_ChangeRequestId);                
      SET @sql = ''                    
                    
      DECLARE education_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEducationDetails'                    
       AND IsNew = 0                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN education_cursor                    
                    
      FETCH NEXT                    
      FROM education_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
      FETCH NEXT                    
       FROM education_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE education_cursor;                    
                    
      DEALLOCATE education_cursor;                    
     END                    
                    
     --TPastEmploymentDetails Insert New                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TPastEmploymentDetails'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
 AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE pastemployment_cursor CURSOR                    
  FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TPastEmploymentDetails'                    
       AND TD.IsNew = 1                    
 AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN pastemployment_cursor                    
                    
      FETCH NEXT                    
      FROM pastemployment_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO TPastEmploymentDetails ( [EmployeeId],[LastModifyOn],[UpdatedDateUtc],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TPastEmploymentDetails'                    
           AND TD.TableName = 'TPastEmploymentDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',GETDATE(),GETUTCDATE(),' + STUFF((                    
       SELECT ',' + CASE                     
   WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
            WHEN y.name IN (                    
     'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
          INNER JOIN sys.tables t ON c.object_id = t.object_id                              INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
   AND s.name IN ('dbo')                    
          WHERE t.name = 'TPastEmploymentDetails'                    
           AND TD.TableName = 'TPastEmploymentDetails'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
          ), 1, 1, '') + ');                
                
    set @id=scope_identity();                
    '                    
                    
       EXEC sp_executesql @sql,N' @id INT OUTPUT', @id=@PastEmploymentID OUTPUT;                    
    INSERT INTO dbo.TPastEmploymentDetails_History                
    (                
        PastEmploymentId,EmployeeId,CompanyName,Roles,Address,KeyExperience,FromDate,ToDate,LeavingReason,JobTitle,                
  CareerBreaksDescription,LeavingSalary,CurrencyId,NoOfReportingPerson,PastCompPersonContactNo,PastCompContactPersonName,                
  LeavingMonthlySalary,Department,PastCompPersonEmailId,LastModifyBy,LastModifyOn,UpdatedDateUtc                
    )                
    SELECT                 
        PastEmploymentId,EmployeeId,CompanyName,Roles,Address,KeyExperience,FromDate,ToDate,LeavingReason,JobTitle,                
  CareerBreaksDescription,LeavingSalary,CurrencyId,NoOfReportingPerson,PastCompPersonContactNo,PastCompContactPersonName,                
  LeavingMonthlySalary,Department,PastCompPersonEmailId, LastModifyBy, LastModifyOn,UpdatedDateUtc                
    FROM                 
        dbo.TPastEmploymentDetails                
    WHERE                 
         PastEmploymentId = @PastEmploymentID                 
       SET @sql = ''                    
     IF EXISTS (Select 1 from TMyDetailsChangeRequestDetails Where CustDetailId=@ChangeRequestId)                
    BEGIN                
       Update TMyDetailsChangeRequestDetails set CustDetailId=@PastEmploymentID                 
    Where CustDetailId=@ChangeRequestId                
    END                
        IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       FETCH NEXT                    
       FROM pastemployment_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE pastemployment_cursor;                    
                    
      DEALLOCATE pastemployment_cursor;                    
     END                    
                    
     --TPastEmploymentDetails Update                    
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TPastEmploymentDetails'                            AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE               
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                    
          'varchar'                    
          ,'nvarchar'                    
          ,'char'                    
          ,'nchar'                    
          ,'datetime'                    
,'date'                    
          ,'varbinary'                    
          )                    
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ', UpdatedDateUtc=GETUTCDATE() Where PastEmploymentId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
      AND s.name IN ('dbo')                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TPastEmploymentDetails'                    
       AND TR.TableName = 'TPastEmploymentDetails'                    
 AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                   
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                    
    INSERT INTO dbo.TPastEmploymentDetails_History                
    (                
PastEmploymentId,EmployeeId,CompanyName,Roles,Address,KeyExperience,FromDate,ToDate,LeavingReason,JobTitle,                
  CareerBreaksDescription,LeavingSalary,CurrencyId,NoOfReportingPerson,PastCompPersonContactNo,PastCompContactPersonName,                
  LeavingMonthlySalary,Department,PastCompPersonEmailId,LastModifyBy,LastModifyOn,UpdatedDateUtc                
    )                
    SELECT                 
        PastEmploymentId,EmployeeId,CompanyName,Roles,Address,KeyExperience,FromDate,ToDate,LeavingReason,JobTitle,                
  CareerBreaksDescription,LeavingSalary,CurrencyId,NoOfReportingPerson,PastCompPersonContactNo,PastCompContactPersonName,                
  LeavingMonthlySalary,Department,PastCompPersonEmailId, LastModifyBy, LastModifyOn,UpdatedDateUtc                
    FROM                 
        dbo.TPastEmploymentDetails                
    WHERE                 
 PastEmploymentId = (Select top 1 ChildRowId from TMyDetailsChangeRequestDetails where ChangeRequestId = @LV_ChangeRequestId)                
      SET @sql = ''                    
                    
      DECLARE pastemployment_cursor CURSOR                    
      FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TPastEmploymentDetails'                    
       AND IsNew = 0                   
 AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN pastemployment_cursor        
                    
      FETCH NEXT                    
      FROM pastemployment_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
   IF NOT EXISTS (SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId )                
  BEGIN                
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
      END                      
                    
       FETCH NEXT                    
      FROM pastemployment_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE pastemployment_cursor;                    
                   
      DEALLOCATE pastemployment_cursor;                    
     END                    
                    
     --TEmployeeCustomFields Insert/Update                    
  --Table names of custom data has been changed PBIID:100729.                  
     IF (                    
       SELECT Count(1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeDetailCustomFields'                    
        AND IsNew  in ( 1 ,0)                   
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                
   --IF EXISTS(Select 1 from TMyDetailsChangeRequestDetails TD                    
   --     JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId where   TR.IsApproved IS NULL)                
   --BEGIN                
   --RAISERROR('Requested Field cannnot be created since Actual Section Field is yet to be approved', 16, 1)                
   --END                
                
      DELETE                    
      FROM TEmployeeDetailCustomFields                    
      WHERE EmployeeId = @EmployeeId                    
       AND CustFieldID IN (                    
        SELECT ChildRowId                    
        FROM TMyDetailsChangeRequestDetails TD                    
        JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
        WHERE TableName = 'TEmployeeDetailCustomFields'                    
         AND IsNew  in ( 1 ,0)                     
         AND IsApproved IS NULL                    
         AND TR.EmployeeId = @EmployeeId                    
   AND TR.ChangeRequestId = @LV_ChangeRequestId                    
        )                 
                   
  --AND CustDetailId IN (                    
  --      SELECT CustDetailId                    
  --      FROM TMyDetailsChangeRequestDetails TD                    
  --      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
  --      WHERE TableName = 'TEmployeeDetailCustomFields'                    
  --       AND IsNew  in ( 1 ,0)                     
  --       AND IsApproved IS NULL                    
  --       AND TR.EmployeeId = @EmployeeId                    
  -- AND TR.ChangeRequestId = @LV_ChangeRequestId                    
  --      )              
                  
                    
      DECLARE @TextValueNew VARCHAR(Max)                    
       ,@ChildRowId INT                    
       ,@ChangeRequestIdCustom INT                 
    ,@CustDetailId VARCHAR(500)                
                    
      DECLARE emp_cursor CURSOR                    
      FOR                    
      SELECT TextValueNew                    
       ,ChildRowId                    
       ,TD.ChangeRequestId                
    ,TR.CustDetailId                
      FROM TMyDetailsChangeRequestDetails TR                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId              
      WHERE TableName = 'TEmployeeDetailCustomFields'                    
       AND TR.IsNew  in ( 1 ,0)                     
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      OPEN emp_cursor                    
                    
      FETCH NEXT                    
      FROM emp_cursor                    
      INTO @TextValueNew                    
       ,@ChildRowId                    
       ,@ChangeRequestIdCustom                
    ,@CustDetailId                
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = @sql + 'Insert Into TEmployeeDetailCustomFields(EmployeeId,CustFieldID,CustomValue,EmployerId,CreatedBy,ModifiedBy,ModifiedDate,ModifiedDateUtc,CustDetailId)' + 'Values (' + Cast(@EmployeeId AS VARCHAR) + ',' +                 
    Cast(@ChildRowId AS VARCHAR) + ',''' + @TextValueNew + ''',' + Cast(@EmployerId AS VARCHAR) + ',' + Cast(@EmployeeId AS VARCHAR) + ',' + Cast(@EmployeeId AS VARCHAR) + ',GetDate(),GetUTCDate(),'+cast(ISNULL(@CustDetailId,'NULL') AS VARCHAR)+') ;     
  
    
      
        
          
           
    SET @CustomFieldId  = SCOPE_IDENTITY();                
    INSERT INTO TEmployeedetailCustomFieldshistory                
(                
    CustomFieldId,                
    EmployeeId,                
    CustFieldID,                
    CustomValue,                
    EmployerId,                
    CreatedBy,                
    CreatedDate,                
    ModifiedBy,                
    ModifiedDate,                
    ModifiedDateUtc,                
 CustDetailId                
)                
SELECT                
    CustomFieldId,                
    EmployeeId,                
    CustFieldID,                
    CustomValue,                
    EmployerId,                
    CreatedBy,                
CreatedDate,                
    ModifiedBy,                
    ModifiedDate,                
    ModifiedDateUtc,                
 CustDetailId                
FROM TEmployeeDetailCustomFields                
WHERE CustomFieldId = @CustomFieldId;                
    '                    
                    
                         
                
       --Update TMyDetailsChangeRequests Set IsApproved = 1 , Comments = @Comments                    
       --Where ChangeRequestId = @ChangeRequestIdCustom                 
       --AND ChangeRequestId = @LV_ChangeRequestId                    
       FETCH NEXT                    
       FROM emp_cursor                     INTO @TextValueNew                    
        ,@ChildRowId                    
        ,@ChangeRequestIdCustom                
  ,@CustDetailId                
      END                    
                    
      CLOSE emp_cursor;                    
                    
      DEALLOCATE emp_cursor;                    
    set @sql='DECLARE @CustomFieldId INT '+@sql                
   EXEC sp_executesql @sql                  
                
                   
      SET @sql = ''                    
     END                    
                    
                    
     --New - Donor Budget Information - START                    
     IF EXISTS (                    
       SELECT (1)                    
       FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR                     
       ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeBudgetSourceDetails'                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       )                     
     BEGIN                    
 DECLARE @RRSId INT                    
                    
      SET @RRSId = (                    
     SELECT RRSId from temployee te                 
       INNER JOIN TRRSCandidate trc ON trc.CandidateId = te.CandidateId                     
       where te.EmployeeId = @EmployeeId                    
      )                     
                    
      DROP TABLE IF EXISTS #MyDetailsBudgetSourceData                    
      SELECT DISTINCT                    
       TRD.ChangeDetailsId,                    
                            TRD.ChangeRequestId,                
                            TRD.TableName,                    
                            TRD.FieldName,                    
                            TRD.NewValue,                    
                     TRD.OldValue,                    
                            TRD.TextValueNew,                    
                            TRD.TextValueOld,                    
                            TRD.SectionName,                    
                            TRD.IsNew,                    
                            TRD.IsChildTableField,                    
                            TRD.ChildRowId,                    
                            TRD.DBFieldName,                    
       TR.CreatedBy AS UpdateRequestedBy,                    
       SUBSTRING(DBFieldName,1,CHARINDEX('_',DBFieldName)-1) AS Mode,                    
       REVERSE(SUBSTRING(REVERSE(DBFieldName),0,CHARINDEX('_',REVERSE(DBFieldName)))) AS EmployeeBudgetSourceDetailID                    
  INTO #MyDetailsBudgetSourceData                    
      FROM TMyDetailsChangeRequests  TR                    
      JOIN TMyDetailsChangeRequestDetails TRD WITH(NOLOCK)                    
      ON TRD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TR.ChangeRequestId=@LV_ChangeRequestId                    
      AND TR.EmployeeId=@EmployeeId                    
                    
      DROP TABLE IF EXISTS #BudgetUpdateDeleteData                    
   SELECT DISTINCT                     
       MDSD.*,                     
       DENSE_RANK() OVER (ORDER BY MDSD.EmployeeBudgetSourceDetailID) AS RowNum                    
      INTO #BudgetUpdateDeleteData                    
      FROM #MyDetailsBudgetSourceData MDSD                    
      WHERE MDSD.Mode<>'Insert'                    
      ORDER BY MDSD.EmployeeBudgetSourceDetailID                    
                          
      DECLARE @UpdateRequestedBy INT                    
      SELECT TOP 1 @UpdateRequestedBy=UpdateRequestedBy FROM #MyDetailsBudgetSourceData                    
                    
      DECLARE @BSDRowNum INT =1                    
      DECLARE @MaxBSDRowNum INT= (SELECT MAX(RowNum) FROM #BudgetUpdateDeleteData)                    
                    
      WHILE (@BSDRowNum<=@MaxBSDRowNum)                    
      BEGIN                    
       DECLARE @UDTEmployeeBudgetSourceDetailID INT                    
       DECLARE @UDTDonorID INT                    
       DECLARE @UDTProjectID INT                    
       DECLARE @UDTBudgetNatureID INT                    
       DECLARE @UDTCTCBifurcation VARCHAR(MAX)                    
       DECLARE @UDTMOUDuration VARCHAR(MAX)                    
                    
       DECLARE @Mode VARCHAR(50)                    
                    
       SELECT TOP 1                    
     @Mode=BUDT.Mode,                    
      @UDTEmployeeBudgetSourceDetailID=BUDT.EmployeeBudgetSourceDetailID                  
       FROM #BudgetUpdateDeleteData BUDT                    
       WHERE BUDT.RowNum =@BSDRowNum                    
                    
       IF @Mode='Delete'                    
       BEGIN                    
        UPDATE S                    
     SET S.IsDeleted=1,                    
         S.UpdatedBy=@UpdateRequestedBy,--@LoggedInUser,                    
         S.UpdatedWhen=GETDATE()                    
        FROM dbo.TEmployeeBudgetSourceDetails S             
        WHERE S.EmployeeBudgetSourceDetailID=@UDTEmployeeBudgetSourceDetailID                    
   END                    
       ELSE                    
       BEGIN                    
        SELECT @UDTDonorID =BUDT.NewValue FROM #BudgetUpdateDeleteData BUDT WHERE BUDT.RowNum =@BSDRowNum AND BUDT.FieldName='DonorID'                    
        SELECT @UDTProjectID =BUDT.NewValue FROM #BudgetUpdateDeleteData BUDT WHERE BUDT.RowNum =@BSDRowNum AND BUDT.FieldName='ProjectID'                    
        SELECT @UDTBudgetNatureID =BUDT.NewValue FROM #BudgetUpdateDeleteData BUDT WHERE BUDT.RowNum =@BSDRowNum AND BUDT.FieldName='BudgetNatureID'                    
        SELECT @UDTCTCBifurcation =BUDT.NewValue FROM #BudgetUpdateDeleteData BUDT WHERE BUDT.RowNum =@BSDRowNum AND BUDT.FieldName='CTCBifurcation'                    
        SELECT @UDTMOUDuration =BUDT.NewValue FROM #BudgetUpdateDeleteData BUDT WHERE BUDT.RowNum =@BSDRowNum AND BUDT.FieldName='MOUDuration'                    
                           
        IF @UDTDonorID<>''                    
        BEGIN                    
         UPDATE TS                     
  SET TS.DonorID=@UDTDonorID,                    
         TS.UpdatedBy=@UpdateRequestedBy,--@LoggedInUser,                    
      TS.UpdatedWhen=GETDATE()                      
         FROM dbo.TEmployeeBudgetSourceDetails TS WHERE TS.EmployeeBudgetSourceDetailID=@UDTEmployeeBudgetSourceDetailID                    
        END                    
    IF @UDTProjectID<>''                    
        BEGIN                    
         UPDATE TS                     
         SET TS.ProjectID=@UDTProjectID,                    
         TS.UpdatedBy=@LoggedInUser,                    
         TS.UpdatedWhen=GETDATE()                      
         FROM dbo.TEmployeeBudgetSourceDetails TS WHERE TS.EmployeeBudgetSourceDetailID=@UDTEmployeeBudgetSourceDetailID                    
        END                    
        IF @UDTBudgetNatureID<>''                    
        BEGIN                    
         UPDATE TS                     
         SET TS.BudgetNatureID=@UDTBudgetNatureID ,                    
         TS.UpdatedBy=@UpdateRequestedBy,--@LoggedInUser,                    
         TS.UpdatedWhen=GETDATE()                      
         FROM dbo.TEmployeeBudgetSourceDetails TS WHERE TS.EmployeeBudgetSourceDetailID=@UDTEmployeeBudgetSourceDetailID                    
        END                    
        IF @UDTCTCBifurcation<>''                    
        BEGIN                    
         UPDATE TS                     
         SET TS.CTCBifurcation=@UDTCTCBifurcation,                    
         TS.UpdatedBy=@UpdateRequestedBy,--@LoggedInUser,                   
         TS.UpdatedWhen=GETDATE()                      
         FROM dbo.TEmployeeBudgetSourceDetails TS WHERE TS.EmployeeBudgetSourceDetailID=@UDTEmployeeBudgetSourceDetailID                    
                    
                                    EXECUTE [dbo].[USP_TCTC_SaveUpdate] @CTCParentID = @UDTEmployeeBudgetSourceDetailID                    
                                     ,@CTCRefrenceType = 'TEmployeeBudgetSourceDetails'                   
                                     ,@CTCBifurcation = @UDTCTCBifurcation                    
                                     ,@UpdatedBy = @UpdateRequestedBy                    
        END   
        IF @UDTMOUDuration<>''                    
        BEGIN                    
         UPDATE TS                    
         SET TS.MOUDuration=@UDTMOUDuration,                    
         TS.UpdatedBy=@UpdateRequestedBy,--@LoggedInUser,                    
         TS.UpdatedWhen=GETDATE()                      
         FROM dbo.TEmployeeBudgetSourceDetails TS WHERE TS.EmployeeBudgetSourceDetailID=@UDTEmployeeBudgetSourceDetailID                    
        END                            
       END                    
                    
                    
       EXEC dbo.USP_Create_Employee_BudgetSourceHistory_Save @EmployeeBudgetSourceDetailID = @UDTEmployeeBudgetSourceDetailID, -- int                    
                                                              @EmployeeId = @EmployeeId,                   -- int                    
                                                              @EmployerId = @EmployerId,                   -- int                    
                         @BudgetSourceStatus =@Mode,       -- varchar(20)                    
                           @CreatedBy = @UpdateRequestedBy --@LoggedInUser         -- int                    
       SET @BSDRowNum=@BSDRowNum+1                    
  END                    
                    
                    
     DROP TABLE IF EXISTS #BudgetUpdateInsertData                    
      SELECT DISTINCT                    
        MDSD.*,                     
       DENSE_RANK() OVER (ORDER BY MDSD.ChildRowId) AS RowNum                    
      INTO #BudgetUpdateInsertData                    
      FROM #MyDetailsBudgetSourceData MDSD                    
      WHERE MDSD.Mode='Insert'                    
      AND MDSD.IsNew=1                    
      --ORDER BY MDSD.EmployeeBudgetSourceDetailID                    
                    
                    
      DECLARE @InsRowNum INT =1                    
      DECLARE @MaxInsRowNum INT= (SELECT MAX(RowNum) FROM #BudgetUpdateInsertData)                    
                    
      WHILE @InsRowNum <=@MaxInsRowNum                    
      BEGIN                    
                           
       DECLARE @InsDonorID INT                    
       DECLARE @InsProjectID INT                    
       DECLARE @InsBudgetNatureID INT                    
    DECLARE @InsCTCBifurcation VARCHAR(MAX)                    
       DECLARE @InsMOUDuration VARCHAR(MAX)                    
                    
       SELECT @InsDonorID = BID.NewValue FROM #BudgetUpdateInsertData BID WHERE BID.RowNum=@InsRowNum AND BID.FieldName='DonorID'                    
       SELECT @InsProjectID = BID.NewValue FROM #BudgetUpdateInsertData BID WHERE BID.RowNum=@InsRowNum AND BID.FieldName='ProjectID'                    
       SELECT @InsBudgetNatureID = BID.NewValue FROM #BudgetUpdateInsertData BID WHERE BID.RowNum=@InsRowNum AND BID.FieldName='BudgetNatureID'                    
       SELECT @InsCTCBifurcation = BID.NewValue FROM #BudgetUpdateInsertData BID WHERE BID.RowNum=@InsRowNum AND BID.FieldName='CTCBifurcation'                    
       SELECT @InsMOUDuration = BID.NewValue FROM #BudgetUpdateInsertData BID WHERE BID.RowNum=@InsRowNum AND BID.FieldName='MOUDuration'                    
                    
       --SELECT @InsDonorID                    
       --SELECT @InsProjectID                    
       --SELECT @InsBudgetNatureID                    
       --SELECT @InsCTCBifurcation                    
       --SELECT @InsMOUDuration                    
                           
       --INSERT INTO dbo.TEmployeeBudgetSourceDetails                    
--(                    
       -- RrsId,                    
       -- RRSBudgetSourceDetailID,                    
       -- DonorID,                    
       -- ProjectID,                    
       -- BudgetNatureID,                    
       -- CTCBifurcation,                    
       -- MOUDuration,                    
       -- IsDeleted,                    
       -- EmployeeId,            
       -- EmployerId,                    
       -- BudgetSourceStatus,                    
       -- CreatedBy,                    
       -- CreatedWhen                    
       --)                    
       --SELECT DISTINCT                    
       -- @RRSId,                      
       -- NULL,                    
       -- @InsDonorID,                    
       -- @InsProjectID,                    
       -- @InsBudgetNatureID,                    
       -- @InsCTCBifurcation,                    
     -- @InsMOUDuration,                    
       -- 0,                    
       -- @EmployeeId,                    
       -- @EmployerId,                            
       -- 'New',                              
       -- @LoggedInUser,                
       -- GETDATE()                     
                    
       DECLARE @EmployeeBudgetSourceDetails UDT_TEmployee_BudgetSourceDetails                    
       INSERT INTO @EmployeeBudgetSourceDetails                    
       (                    
           EmployeeBudgetSourceDetailID,                    
           RRSBudgetSourceDetailID,                    
           DonorID,                    
           ProjectID,                    
           BudgetNatureID,                    
   CTCBifurcation,                    
           MOUDuration                    
       )                    
       VALUES                    
       (   0, -- EmployeeBudgetSourceDetailID - int                    
           0, -- RRSBudgetSourceDetailID - int                    
           @InsDonorID, -- DonorID - int                    
           @InsProjectID, -- ProjectID - int                    
           @InsBudgetNatureID, -- BudgetNatureID - int                    
           @InsCTCBifurcation, -- CTCBifurcation - decimal(18, 2)                    
           @InsMOUDuration  -- MOUDuration - datetime                    
       )                    
                    
       EXEC dbo.USP_Create_Employee_BudgetSource_Save @EmployeeBudgetSourceDetails = @EmployeeBudgetSourceDetails, -- UDT_TEmployee_BudgetSourceDetails                    
                                    @RRSId = 0,                          -- int                    
                                        @EmployeeID = @EmployeeId,               -- int                    
                @EmployerID = @EmployerId,            -- int                    
                                     @CreatedBy =  @UpdateRequestedBy --@LoggedInUser  -- int                    
                           
       SET @InsRowNum=@InsRowNum+1                    
      END                    
     END                    
                    
     --New - Donor Budget Information - END                    
                    
                 
     --83417 EmployeeAttachment - START                    
     IF (                    
       SELECT COUNT(1)                    
       FROM TMyDetailsChangeRequestDetails TD                  
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeAttachment'                    
        AND IsNew = 1                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      DECLARE pastemployment_cursor CURSOR                    
      FOR                    
 SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
   WHERE TD.TableName = 'TEmployeeAttachment'                    
       AND TD.IsNew = 1                    
       AND TD.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                 
      OPEN pastemployment_cursor                    
                
      FETCH NEXT                    
      FROM pastemployment_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN                    
       SELECT @sql = 'INSERT INTO dbo.TEmployeeAttachment ( [EmployeeId],[LastUpdatedBy],[LastUpdatedOn],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
   INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeAttachment'                    
      AND TD.TableName = 'TEmployeeAttachment'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL                    
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
           AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
          FOR XML PATH('')                    
     ), 1, 1, '') + ') VALUES (' + Cast(@EmployeeId AS VARCHAR) + ',' + Cast(@LoggedInUser AS VARCHAR) + ',GETDATE(),' + STUFF((                    
          SELECT ',' + CASE                     
            WHEN TD.TextValueNew LIKE '%Fn_EncryptData%'                    
             THEN TD.TextValueNew                    
     WHEN y.name IN (                    
          'varchar'                    
              ,'nvarchar'                    
              ,'char'                    
              ,'nchar'                    
              ,'datetime'                    
              ,'date'                    
              ,'varbinary'                    
              )                    
             THEN '''' + TD.TextValueNew + ''''                    
            ELSE TD.TextValueNew                    
            END                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
          INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
           AND s.name IN ('dbo')                    
          WHERE t.name = 'TEmployeeAttachment'                    
           AND TD.TableName = 'TEmployeeAttachment'                    
           AND y.name NOT IN ('sysname')                    
           AND TD.IsNew = 1                    
           AND TD.TextValueNew IS NOT NULL          
           AND IsApproved IS NULL                    
           AND TR.EmployeeId = @EmployeeId                    
          AND TD.ChangeRequestId = @ChangeRequestId                    
          ORDER BY ChangeDetailsId                    
      FOR XML PATH('')                    
          ), 1, 1, '') + ')'                    
                    
     EXEC sp_executesql @sql;                    
                    
       SET @sql = ''                    
                    
       UPDATE TMyDetailsChangeRequests                  
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
                    
       FETCH NEXT                    
       FROM pastemployment_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE pastemployment_cursor;                    
                    
      DEALLOCATE pastemployment_cursor;                    
     END                    
                    
     IF (                    
       SELECT Count(1)                    
FROM TMyDetailsChangeRequestDetails TD                    
       JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
       WHERE TableName = 'TEmployeeAttachment'                    
        AND IsNew = 0                    
        AND IsApproved IS NULL                    
        AND TR.EmployeeId = @EmployeeId                    
        AND TR.ChangeRequestId = @LV_ChangeRequestId                    
       ) > 0                    
     BEGIN                    
      SELECT @sql = @sql + 'UPDATE ' + t.name + ' SET ' + c.name + ' = ' + CASE                     
        WHEN TR.TextValueNew LIKE '%Fn_EncryptData%'                    
         THEN TR.TextValueNew                    
        WHEN y.name IN (                   
     'varchar'                    
          ,'nvarchar'                    
          ,'char'                 
,'nchar'                    
          ,'datetime'                    
          ,'date'                    
          ,'varbinary'                    
          )                  
         THEN '''' + TR.TextValueNew + ''''                    
        ELSE TR.TextValueNew                    
        END + ', LastUpdatedOn = GETDATE() Where AttachmentId= ' + Cast(TR.ChildRowId AS VARCHAR) + ';'                    
      FROM sys.columns c                    
      INNER JOIN sys.tables t ON c.object_id = t.object_id                    
      INNER JOIN sys.schemas s ON S.schema_id = T.schema_id                    
       AND s.name IN ('dbo')                    
      INNER JOIN sys.types y ON c.system_type_id = y.system_type_id                    
      INNER JOIN TMyDetailsChangeRequestDetails TR ON c.name = TR.DBFieldName                    
      JOIN TMyDetailsChangeRequests TD ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE t.name = 'TEmployeeAttachment'                    
       AND TR.TableName = 'TEmployeeAttachment'                    
       AND TR.IsNew = 0                    
       AND y.name NOT IN ('sysname')                    
       AND TR.TextValueNew IS NOT NULL                    
       AND IsApproved IS NULL                    
       AND TD.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId;                    
                    
      EXEC sp_executesql @sql;                    
                    
      SET @sql = ''                    
                    
      DECLARE education_cursor CURSOR                    
FOR                    
      SELECT DISTINCT TR.ChangeRequestId                    
      FROM TMyDetailsChangeRequestDetails TD                    
      JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
      WHERE TD.TableName = 'TEmployeeAttachment'                    
  AND IsNew = 0                    
       AND IsApproved IS NULL                    
       AND TR.EmployeeId = @EmployeeId                    
       AND TR.ChangeRequestId = @LV_ChangeRequestId                    
                    
      OPEN education_cursor                    
              
      FETCH NEXT                    
      FROM education_cursor                    
      INTO @ChangeRequestId                    
                    
      WHILE @@FETCH_STATUS = 0                    
      BEGIN         
       UPDATE TMyDetailsChangeRequests                    
       SET IsApproved = 1                    
        ,Comments = @Comments                    
       WHERE ChangeRequestId = @ChangeRequestId                    
        AND ChangeRequestId = @LV_ChangeRequestId                    
                    
       FETCH NEXT                    
       FROM education_cursor                    
       INTO @ChangeRequestId                    
      END                    
                    
      CLOSE education_cursor;                    
                    
      DEALLOCATE education_cursor;                    
     END                    
     --83417 EmployeeAttachment - END                    
                    
     UPDATE TRequestWorkflows                    
     SET ApproveStatus = 'C'                    
     WHERE RequestTransid = @LV_ChangeRequestId and RequestType='EmploymentTypeChange'                    
                    
                         
                    
     UPDATE TMyDetailsChangeRequests                    
     SET IsApproved = 1                    
      ,Comments = @Comments                  
     WHERE EmployeeId = @EmployeeId                    
      AND EmployerId = @EmployerId                    
    AND Comments IS NULL                    
      AND ChangeRequestId = @LV_ChangeRequestId                    
    END                    
   END                    
 ELSE                    
   BEGIN                    
    UPDATE TMyDetailsChangeRequests                    
    SET IsApproved = 0                    
     ,Comments = @Comments                    
    WHERE EmployeeId = @EmployeeId                    
     AND EmployerId = @EmployerId                    
     AND Comments IS NULL                    
     AND ChangeRequestId = @LV_ChangeRequestId                    
   END                    
                    
   UPDATE TRequestWorkflows                    
   SET IsApprove = 1                    
    ,ApproveStatus = CASE                     
     WHEN @Status = 'Approved'                    
      THEN 'C'                    
     ELSE 'R'                    
     END                    
    ,UpdatedBy = @LoggedInUser                    
    ,UpdatedDate = GETDATE()                    
    ,Comments = @Comments                  
   WHERE RequestTransid = @LV_ChangeRequestId                    
    AND WorkflowId = (                    
 SELECT WorkflowId                    
     FROM #tmpFlowDetails                    
     )                    
    AND ApproveStatus = 'P'                    
  END                
                    
  COMMIT TRANSACTION                    
 END TRY                   
                    
 BEGIN CATCH                  
  SELECT 0 AS Error                    
   ,'Failed Due to Transaction Fail! Please Try Again' AS [Message]                    
                
  ROLLBACK TRANSACTION                    
 END CATCH                    
                    
 DROP TABLE #tmpFlowDetails                    
                    
 EXEC SP_CloseEncryptionKey                    
END