DECLARE @EmployeeId INT = 1430,
        @EmploymentNumber NVARCHAR(50) = 'T0065651';

SELECT 
    TU.UserID,
    TE.EmployeeId,
    TU.Employerid, 
    -- TR.RoleID,
    TR.RoleName,
    TE.FName,
    TE.LName,
    TEI.EmploymentNumber,
    TE.IsActive
FROM TUsers AS TU
INNER JOIN TUserEmployee AS TUE ON TUE.UserID = TU.UserID
INNER JOIN TRoles AS TR ON TR.RoleID = TU.RoleID
INNER JOIN TEmployee AS TE ON TUE.EmployeeId = TE.EmployeeId AND TE.Employerid = TU.Employerid
INNER JOIN TEmployeeInfo AS TEI ON TE.EmployeeId = TEI.EmployeeId
WHERE TE.EmployeeId = @EmployeeId OR TEI.EmploymentNumber = @EmploymentNumber;