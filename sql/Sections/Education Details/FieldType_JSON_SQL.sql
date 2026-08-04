---------- ID ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'SELECT a.EmployeeId AS ID 		,CONCAT ( 			dbo.Fn_GetEmployeeName(a.EmployeeId) 			,''('' 			,b.EmploymentNumber 			,'')'' 			) AS [Value] 	FROM TEmployee a 		,TEmployeeInfo b 		,TEmployerDetails ED 	WHERE a.EmployeeId = b.EmployeeId 		AND b.EmployerID = ED.EmployerId 		AND a.IsActive = ''Y''		AND a.Employerid = @EmployerId 		AND A.EmployeeId IN (SELECT EmployeeId FROM dbo.FN_LocationBU_GetEmployeeDetails_Clone(@EmployeeId,@EmployerId)) 		AND ISNULL(A.CountryOfEmployment,0) = CASE WHEN ISNULL(@CountryId,0) = 0 THEN ISNULL(A.CountryOfEmployment,0) ELSE @CountryId END'  WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Type of Establishment ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @EstablishmentTypes TABLE (
    EstablishmentTypeId INT,
    EstablishmentType NVARCHAR(100),
    UpdatedBy INT NULL,
    Updatedate DATETIME NULL,
    CreatedBy INT,
    CreatedDate DATETIME,
    employerid INT
)

INSERT INTO @EstablishmentTypes EXEC SP_CM_GetEstablishmentType @EmployerId

SELECT EstablishmentTypeId AS ID, EstablishmentType AS Value FROM @EstablishmentTypes' WHERE FieldName = 'Type of Establishment' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section = 'Education Details')

---------- Name of Establishment ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @EstablishmentNames TABLE (
    EstablishmentNameId INT,
    EstablishmentName NVARCHAR(200),
    UpdatedBy INT NULL,
    Updatedate DATETIME NULL,
    CreatedBy INT,
    CreatedDate DATETIME,
    employerid INT
)

INSERT INTO @EstablishmentNames EXEC SP_CM_GetEstablishmentName @EmployerId

SELECT EstablishmentNameId AS ID, EstablishmentName AS Value FROM @EstablishmentNames' WHERE FieldName = 'Name of Establishment' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section = 'Education Details')

---------- University ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @Universities TABLE (
    UniversityId INT,
    UniversityName NVARCHAR(100)
)

INSERT INTO @Universities EXEC SP_CM_GetUniversityDet @EmployerId

SELECT UniversityId AS ID, UniversityName AS Value FROM @Universities' WHERE FieldName = 'University' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Discipline ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @Disciplines TABLE (
    ID INT,
    QualificationName NVARCHAR(250),
    Keywords NVARCHAR(250)
)

INSERT INTO @Disciplines EXEC SP_EMPMD_GetQualificationName @EmployerId

SELECT ID, QualificationName AS Value FROM @Disciplines' WHERE FieldName = 'Discipline' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Level (Qualification Level) ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @QualificationLevels TABLE (
    QualificationLevelId INT,
    QualificationLevelName NVARCHAR(100),
    UpdatedBy INT NULL,
    Updatedate DATETIME NULL,
    CreatedBy INT,
    CreatedDate DATETIME,
    employerid INT
)

INSERT INTO @QualificationLevels EXEC SP_GetQualificationLevel @EmployerId

SELECT QualificationLevelId AS ID, QualificationLevelName AS Value FROM @QualificationLevels' WHERE FieldName = 'Level' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Subject ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @Subjects TABLE (
    SubjectId INT,
    SubjectName NVARCHAR(100),
    UpdatedBy INT NULL,
    Updatedate DATETIME NULL,
    CreatedBy INT,
    CreatedDate DATETIME,
    employerid INT
)

INSERT INTO @Subjects EXEC SP_CM_GetSubjectDetails @EmployerId

SELECT SubjectId AS ID, SubjectName AS Value FROM @Subjects' WHERE FieldName = 'Subject' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Major Fields ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @MajorFields TABLE (
    MajorFieldId INT,
    MajorFieldDesc NVARCHAR(100)
)

INSERT INTO @MajorFields EXEC SP_CM_GetMajorFields @EmployerId

SELECT MajorFieldId AS ID, MajorFieldDesc AS Value FROM @MajorFields' WHERE FieldName = 'Major Field' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Minor Fields ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'DECLARE @MinorFields TABLE (
    MinorFieldId INT,
    MinorFieldDesc NVARCHAR(100)
)

INSERT INTO @MinorFields EXEC SP_CM_GetMinorFields @EmployerId

SELECT MinorFieldId AS ID, MinorFieldDesc AS Value FROM @MinorFields' WHERE FieldName = 'Minor Field' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Company Sponsored ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = '[{"ID":true,"Value":"Yes"},{"ID":false,"Value":"No"}]' WHERE FieldName = 'Company Sponsored' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- GPA/Grade ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = '[{"ID":"Grade A","Value":"Grade A"},{"ID":"Grade B","Value":"Grade B"},{"ID":"Grade C","Value":"Grade C"}]' WHERE FieldName = 'GPA/Grade' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- CP's Approval -----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = '[{"ID":true,"Value":"Yes"},{"ID":false,"Value":"No"}]' WHERE FieldName = 'CPs Approval' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Study Leave ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = '[{"ID":true,"Value":"With Pay"},{"ID":false,"Value":"Without Pay"}]' WHERE FieldName = 'Study Leave' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')

---------- Currency ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = 'SELECT ID, CURRENCYCODE AS Value FROM TCOUNTRY WHERE CURRENCYCODE IS NOT NULL' WHERE FieldName = 'Currency' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Education Details')