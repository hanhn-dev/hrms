SELECT 
  missix.index_handle,
  t.name,
  missix.equality_columns,
  missix.inequality_columns,
  missix.[statement]
FROM sys.dm_db_missing_index_details missix
INNER JOIN sys.tables t ON t.object_id = missix.object_id


SELECT TOP 100 * FROM TEmployeeDetail_Section


SELECT TOP 100 * FROM TEmployeeDetail_Fields WHERE DisplayText LIKE 'Acquired Qualification' AND EmployerId = 10

SELECT TOP 100 ValidationRule, * FROM TEmployeeDetail_Fields WHERE DisplayText LIKE '%Field-7%' AND EmployerId = 315

DECLARE @pEmployeeId INT,
        @pViewType VARCHAR(1)
            SELECT @pEmployeeId AS EmpId WHERE @pViewType = 'E'

SELECT
    OBJECT_SCHEMA_NAME(d.referencing_id) AS ReferencingSchema,
    OBJECT_NAME(d.referencing_id) AS ReferencingObject,
    o.type_desc AS ObjectType
FROM sys.sql_expression_dependencies d
JOIN sys.objects o
    ON d.referencing_id = o.object_id
WHERE d.referenced_id = OBJECT_ID('dbo.TEmployee');


SELECT *
FROM sys.dm_sql_referencing_entities(
    'dbo.TEmployee',
    'OBJECT'
);

DECLARE @EmployeeId INT = 1431,
        @ChangeRequestId INT = 10286,
        @sql VARCHAR (MAX);

SELECT
    SCHEMA_NAME(Tables.schema_id) AS TableSchema,
    Tables.name AS TableName,
    Tables.create_date
FROM sys.tables AS Tables
WHERE
    Tables.name = N'TEmployeeFamilyDetails'
ORDER BY
    TableSchema;


    SELECT @sql = 'INSERT INTO TEmployeeFamilyDetails ( [EmployeeID],[IsDelete],[CreatedDate],[CreatedBy],[UpdatedBy],[CreatedDateUtc],[UpdatedDateUtc],' + STUFF((                    
          SELECT ', [' + TD.DBFieldName + ']'                    
          FROM sys.columns c                    
          INNER JOIN TMyDetailsChangeRequestDetails TD ON c.name = TD.DBFieldName                    
          JOIN TMyDetailsChangeRequests TR ON TD.ChangeRequestId = TR.ChangeRequestId                    
          INNER JOIN sys.types y ON c.system_type_id = y.system_type_id             
          INNER JOIN sys.tables t ON c.object_id = t.object_id                    
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

SELECT @sql

INSERT INTO TEmployeeFamilyDetails ( [EmployeeID],[IsDelete],[CreatedDate],[CreatedBy],[UpdatedBy],[CreatedDateUtc],[UpdatedDateUtc], [Address], [Address], [DateOfBirth], [DateOfBirth], [Dependant], [Dependant], [Insured], [Insured], [Minor], [Minor], [Name], [Name], [Relation], [Relation], [AadharNumber], [AadharNumber]) VALUES (1431,0,GETDATE(),1431,1431,GETUTCDATE(),GETUTCDATE(),'70 Acme Street, Chennai','27-Sep-2018',1,0,1,'Hanh Nguyen','33288','27-Sep-2018');                                      set @id=scope_identity();                     

sp_helptext 'Sp_ApproveRejectMyDetailsReview'