SELECT TOP 100 TE.EmployeeId  FROM TEmployee TE
INNER JOIN TEmployeeInfo AS TEI ON TEI.EmployeeId = TE.EmployeeId
WHERE TEI.EmploymentNumber = '00007'