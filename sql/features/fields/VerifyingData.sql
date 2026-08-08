DECLARE @EmployeeId INT = 1430;

----------- Personal Details --------
SELECT TitleID,
    FName,
    LName,
    MiddleName,
	TT.PersonalTitle,
    TG.Gender,
    TMS.MaritalStatus,
    DoB,
    WeddingDate,
    BirthCountryName,
    StateofBirth,
    Nationality,
    dbo.Fn_DecryptDataNew(BloodGroup_Encrypted) AS BloodGroup,
    PostalZipCode,
    BirthZipCode,
    PermanentAddress,
    PermanentZipCode,
    EmailID,
    TaxId,
    AadharNumber
FROM TEmployee AS TE
INNER JOIN TGender AS TG ON TE.Gender = TG.ID
INNER JOIN TMaritalStatus AS TMS ON TMS.ID = TE.MaritalStatusID
INNER JOIN TPersonalTitle AS TT ON TE.TitleID = TT.ID
WHERE EmployeeId IN (@EmployeeId)

---------- SKILLS ---------
SELECT TSD.EmployeeId, TSD.SkillId, TS.SkillName, TSD.[Level], TSD.ExperianceInMonths, TSD.LastModifyOn, TSD.LastUsedDate
FROM TEmployeeSkillDetails AS TSD
    LEFT JOIN TMSkills AS TS ON TS.SkillID = TSD.SkillId
WHERE TSD.EmployeeId IN (@EmployeeId)

---------- DOMAINS ---------
SELECT TEDD.EmployeeId, TEDD.DomainId, TSDM.DomainName, TEDD.ExperianceInMonths, TEDD.LastModifiedBy, TEDD.LastModifiedDate
FROM TEmployeeDomainDetails AS TEDD
LEFT JOIN TSkillDomainMaster AS TSDM ON TEDD.DomainId = TSDM.Domainid
WHERE TEDD.EmployeeId IN (@EmployeeId)

---------- PASSPORT ---------
SELECT TEPD.*
FROM TEmployeePassportDetails AS TEPD
LEFT JOIN TEmployee AS TE ON TE.EmployeeId = TEPD.EmployeeId
WHERE TE.EmployeeId IN (@EmployeeId, 1431)

---------- VISA ---------
SELECT TOP 100 * FROM TEmployeeVisaInfo AS TEVI
LEFT JOIN TEmployee AS TE ON TEVI.EmployeeId = TE.EmployeeId
WHERE TE.EmployeeId IN (1430)

SELECT TOP 100 * FROM TEmployeeDetail_Fields WHERE SectionID = 9


SELECT TUS.*
FROM TEmployeeDetail_Upload_Section AS TUS
    INNER JOIN TEmployeeDetail_Upload AS TU ON TUS.UploadID = TU.UploadID
WHERE TUS.UploadID = (SELECT MAX(UploadID)
FROM TEmployeeDetail_Upload
WHERE CreatedBy = 1436)