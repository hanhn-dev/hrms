---------- RESET FieldType_JSON_SQL ----------
UPDATE TEmployeeDetail_Fields SET FieldType_JSON_SQL = NULL WHERE SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- ID ---------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'SELECT a.EmployeeId AS ID   ,CONCAT (    dbo.Fn_GetEmployeeName(a.EmployeeId)    ,''(''    ,b.EmploymentNumber    ,'')''    ) AS [Value]  FROM TEmployee a   ,TEmployeeInfo b   ,TEmployerDetails ED  WHERE a.EmployeeId = b.EmployeeId   AND b.EmployerID = ED.EmployerId   AND a.IsActive = ''Y''   AND a.Employerid = @EmployerId   AND A.EmployeeId IN (SELECT EmployeeId FROM dbo.FN_LocationBU_GetEmployeeDetails_Clone(@EmployeeId,@EmployerId))   AND ISNULL(A.CountryOfEmployment,0) = CASE WHEN ISNULL(@CountryId,0) = 0 THEN ISNULL(A.CountryOfEmployment,0) ELSE @CountryId END' WHERE FieldName = 'ID' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Skill ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'SELECT SkillId As ID,SkillName as Value FROM dbo.TMSkills WHERE EmployerID=@EmployerId' WHERE FieldName = 'Skill' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Certificate/Exam ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 2, FieldType_JSON_SQL = 'DECLARE @Certifications TABLE(
    ID INT,
    CertificationName NVARCHAR(255),
    CertificationDesc NVARCHAR(255)
)

INSERT INTO @Certifications EXEC SP_CM_GetCertificationDet @EmployerId

SELECT ID, CertificationName AS Value FROM @Certifications' WHERE FieldName = 'Certificate/Exam' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Certified On ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 3, [Format] = 'DD-MMM-YYYY', IsMandatory = 1 WHERE FieldName = 'Certified On' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Expiry/Renewal Date ----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 3, [Format] = 'DD-MMM-YYYY', IsMandatory = 1 WHERE FieldName = 'Expiry/Renewal Date' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Renewed On -----------
UPDATE TEmployeeDetail_Fields SET FieldTypeID = 3, [Format] = 'DD-MMM-YYYY', IsMandatory = 0 WHERE FieldName = 'Renewed On' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Institution -----------
UPDATE TEmployeeDetail_Fields SET IsMandatory = 0, FieldTypeID = 4 WHERE FieldName = 'Institution' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- Reference # ----------
UPDATE TEmployeeDetail_Fields SET IsMandatory = 1, FieldTypeID = 4 WHERE FieldName = 'Reference #' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')

---------- CertificationDetailId ----------
UPDATE TEmployeeDetail_Fields SET IsMandatory = 1, FieldTypeID = 4 WHERE FieldName = 'CertificationDetailId' AND SectionID = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section='Certification Details')
