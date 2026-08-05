-- Get employee information by EmployeeId and/or EmploymentNumber.
-- Set one or both parameters; NULL parameters are ignored.
DECLARE @EmployeeId INT = NULL,                 -- e.g. 1430
        @EmploymentNumber NVARCHAR(50) = NULL;  -- e.g. 'T0065651'

-- Core employee + employment + org lookups
SELECT
    TE.EmployeeId,
    TEI.EmploymentNumber,
    TE.Employerid AS EmployerId,
    ED.EmployerName,
    LTRIM(RTRIM(CONCAT_WS(' ', TE.FName, TE.MiddleName, TE.LName))) AS FullName,
    TE.FName,
    TE.MiddleName,
    TE.LName,
    TE.EmailID AS WorkEmail,
    TE.PersonalEmailId,
    TE.CellNumber,
    TE.IsActive,
    TEI.DOJ AS DateOfJoining,
    TEI.DOT AS DateOfTermination,
    TEI.LastWorkingDate,
    TEI.ConfirmationDueDate,
    TEI.confirmationdate AS ConfirmationDate,
    T.Title AS Designation,
    TEI.Title AS TitleId,
    ET.EmploymentType,
    TEI.EmploymentTypeID,
    L.LocationName,
    TEI.LocationId,
    BU.UnitName AS BusinessUnitName,
    TEI.BusinessUnitId,
    TEI.Department AS DepartmentId,
    TEI.FunctionalManager AS FunctionalManagerId,
    FM.EmploymentNumber AS FunctionalManagerEmploymentNumber,
    LTRIM(RTRIM(CONCAT_WS(' ', FME.FName, FME.MiddleName, FME.LName))) AS FunctionalManagerName,
    Org.ReportsTo AS ReportsToEmployeeId,
    RT.EmploymentNumber AS ReportsToEmploymentNumber,
    LTRIM(RTRIM(CONCAT_WS(' ', RTE.FName, RTE.MiddleName, RTE.LName))) AS ReportsToName,
    TU.UserID,
    TR.RoleID,
    TR.RoleName,
    TR.RoleType
FROM TEmployee AS TE WITH (NOLOCK)
INNER JOIN TEmployeeInfo AS TEI WITH (NOLOCK)
    ON TEI.EmployeeId = TE.EmployeeId
LEFT JOIN TEmployerDetails AS ED WITH (NOLOCK)
    ON ED.Employerid = TE.Employerid
LEFT JOIN TTitle AS T WITH (NOLOCK)
    ON T.ID = TEI.Title
    AND T.Employerid = TEI.EmployerID
LEFT JOIN TMEmploymentTypes AS ET WITH (NOLOCK)
    ON ET.EmploymentTypeID = TEI.EmploymentTypeID
LEFT JOIN TLocation AS L WITH (NOLOCK)
    ON L.LocationId = TEI.LocationId
LEFT JOIN TOrgHierarchyDetails AS BU WITH (NOLOCK)
    ON BU.UnitID = TEI.BusinessUnitId
LEFT JOIN TEmployeeInfo AS FM WITH (NOLOCK)
    ON FM.EmployeeId = TEI.FunctionalManager
LEFT JOIN TEmployee AS FME WITH (NOLOCK)
    ON FME.EmployeeId = TEI.FunctionalManager
LEFT JOIN TORGChart AS Org WITH (NOLOCK)
    ON Org.EmployeeID = TE.EmployeeId
LEFT JOIN TEmployeeInfo AS RT WITH (NOLOCK)
    ON RT.EmployeeId = Org.ReportsTo
LEFT JOIN TEmployee AS RTE WITH (NOLOCK)
    ON RTE.EmployeeId = Org.ReportsTo
LEFT JOIN TUserEmployee AS TUE WITH (NOLOCK)
    ON TUE.EmployeeID = TE.EmployeeId
LEFT JOIN TUsers AS TU WITH (NOLOCK)
    ON TU.UserID = TUE.UserID
    AND TU.Employerid = TE.Employerid
LEFT JOIN TRoles AS TR WITH (NOLOCK)
    ON TR.RoleID = TU.RoleID
WHERE
    (
        (@EmployeeId IS NOT NULL AND TE.EmployeeId = @EmployeeId)
        OR (@EmploymentNumber IS NOT NULL AND TEI.EmploymentNumber = @EmploymentNumber)
    );
