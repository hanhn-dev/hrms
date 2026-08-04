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

-- Get employee managers information
SELECT EI.EmployeeId,
    EI.EmploymentNumber,
    (E.FName + ' ' + E.LName) AS FullName,
    L1.EmployeeId AS 'L1 EmployeeId',
    L1.EmploymentNumber AS 'L1 EmploymentNumber',
    L2.EmployeeId AS 'L2 EmployeeId',
    L2.EmploymentNumber AS 'L2 EmploymentNumber'
FROM TEmployeeInfo EI 
JOIN TORGChart Org ON EI.EmployeeId = Org.EmployeeID
INNER JOIN TEmployee E ON EI.EmployeeId = E.EmployeeId
OUTER APPLY (SELECT TOP 1 * FROM TEmployeeInfo WHERE EmployeeID = EI.FunctionalManager) L1
OUTER APPLY (SELECT TOP 1 * FROM TEmployeeInfo WHERE EmployeeID = Org.reportsto) L2
WHERE EI.EmployeeId = @EmployeeId OR EI.EmploymentNumber = @EmploymentNumber
