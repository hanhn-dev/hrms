-- Get employee summary (designation, grade, managers, org context, etc.)
-- by EmployeeId and/or EmploymentNumber. NULL parameters are ignored.
DECLARE @EmployeeId INT = 1431,                 -- e.g. 1430
        @EmploymentNumber NVARCHAR(50) = NULL;  -- e.g. 'T0065651'

SELECT
    -- Identity
    TE.EmployeeId,
    TEI.EmploymentNumber,
    TE.Employerid AS EmployerId,
    ED.EmployerName,
    LTRIM(RTRIM(CONCAT_WS(' ', TE.FName, TE.MiddleName, TE.LName))) AS FullName,
    TE.IsActive,

    -- Contact
    TE.EmailID AS WorkEmail,
    TE.PersonalEmailId,
    TE.CellNumber,

    -- Designation / grade
    T.Title AS Designation,
    TEI.Title AS TitleId,
    TG.GradeName AS Grade,
    TEI.Grade AS GradeId,
    COALESCE(NULLIF(LTRIM(RTRIM(TEI.GradeBand)), ''), TG.GradeBand) AS GradeBand,
    TEI.GradeBand AS GradeBandStored,

    -- Employment
    ET.EmploymentType,
    TEI.EmploymentTypeID,
    TEI.DOJ AS DateOfJoining,
    TEI.DOT AS DateOfTermination,
    TEI.LastWorkingDate,
    TEI.ConfirmationDueDate,
    TEI.confirmationdate AS ConfirmationDate,

    -- Organization
    L.LocationName,
    TEI.LocationId,
    BU.UnitName AS BusinessUnitName,
    TEI.BusinessUnitId,
    DEPT.UnitName AS DepartmentName,
    TEI.Department AS DepartmentId,

    -- Functional Manager
    TEI.FunctionalManager AS FunctionalManagerId,
    FMI.EmploymentNumber AS FunctionalManagerEmploymentNumber,
    LTRIM(RTRIM(CONCAT_WS(' ', FME.FName, FME.MiddleName, FME.LName))) AS FunctionalManagerName,
    FME.EmailID AS FunctionalManagerWorkEmail,

    -- Reporting Manager (org chart ReportsTo)
    Org.ReportsTo AS ReportingManagerId,
    RMI.EmploymentNumber AS ReportingManagerEmploymentNumber,
    LTRIM(RTRIM(CONCAT_WS(' ', RME.FName, RME.MiddleName, RME.LName))) AS ReportingManagerName,
    RME.EmailID AS ReportingManagerWorkEmail,

    -- Review Manager
    TEI.ReviewManager AS ReviewManagerId,
    RVI.EmploymentNumber AS ReviewManagerEmploymentNumber,
    LTRIM(RTRIM(CONCAT_WS(' ', RVE.FName, RVE.MiddleName, RVE.LName))) AS ReviewManagerName,
    RVE.EmailID AS ReviewManagerWorkEmail
FROM TEmployee AS TE WITH (NOLOCK)
INNER JOIN TEmployeeInfo AS TEI WITH (NOLOCK)
    ON TEI.EmployeeId = TE.EmployeeId
LEFT JOIN TEmployerDetails AS ED WITH (NOLOCK)
    ON ED.Employerid = TE.Employerid
LEFT JOIN TTitle AS T WITH (NOLOCK)
    ON T.ID = TEI.Title
    AND T.Employerid = TEI.EmployerID
LEFT JOIN TGrade AS TG WITH (NOLOCK)
    ON TG.GradeId = TEI.Grade
LEFT JOIN TMEmploymentTypes AS ET WITH (NOLOCK)
    ON ET.EmploymentTypeID = TEI.EmploymentTypeID
LEFT JOIN TLocation AS L WITH (NOLOCK)
    ON L.LocationId = TEI.LocationId
LEFT JOIN TOrgHierarchyDetails AS BU WITH (NOLOCK)
    ON BU.UnitID = TEI.BusinessUnitId
LEFT JOIN TOrgHierarchyDetails AS DEPT WITH (NOLOCK)
    ON DEPT.UnitID = TEI.Department
-- Functional Manager
LEFT JOIN TEmployeeInfo AS FMI WITH (NOLOCK)
    ON FMI.EmployeeId = TEI.FunctionalManager
LEFT JOIN TEmployee AS FME WITH (NOLOCK)
    ON FME.EmployeeId = TEI.FunctionalManager
-- Reporting Manager
LEFT JOIN TORGChart AS Org WITH (NOLOCK)
    ON Org.EmployeeID = TE.EmployeeId
LEFT JOIN TEmployeeInfo AS RMI WITH (NOLOCK)
    ON RMI.EmployeeId = Org.ReportsTo
LEFT JOIN TEmployee AS RME WITH (NOLOCK)
    ON RME.EmployeeId = Org.ReportsTo
-- Review Manager
LEFT JOIN TEmployeeInfo AS RVI WITH (NOLOCK)
    ON RVI.EmployeeId = TEI.ReviewManager
LEFT JOIN TEmployee AS RVE WITH (NOLOCK)
    ON RVE.EmployeeId = TEI.ReviewManager
WHERE
    (
        (@EmployeeId IS NOT NULL AND TE.EmployeeId = @EmployeeId)
        OR (@EmploymentNumber IS NOT NULL AND TEI.EmploymentNumber = @EmploymentNumber)
    );
