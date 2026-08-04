DECLARE @EmployeeId INT = 1710,
        @EmploymentNumber VARCHAR(10) = '00015';

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


