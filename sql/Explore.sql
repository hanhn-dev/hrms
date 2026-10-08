SELECT TOP 100 crd.* FROM TMyDetailsChangeRequestDetails crd
INNER JOIN TMyDetailsChangeRequests cr ON crd.ChangeRequestId = crd.ChangeRequestId
WHERE cr.EmployeeId = 1434
ORDER BY crd.ChangeRequestId DESC

SELECT TOP 100 IsMinor, DOB, * FROM TEmployeeNominee_Details WHERE EmployeeId = 1434
SELECT TOP 100 IsMinor, DOB, * FROM TEmployeeNominee_Details_History WHERE EmployeeID = 1434 ORDER BY CreatedDateUtc DESC

SELECT TOP 100 FieldType_JSON_SQL, * FROM TEmployeeDetail_Fields WHERE DisplayText LIKE '%Branch Name%' AND EmployerID = 10

Select Distinct TB.BranchName AS ID,TB.BranchName Value, TBK.BankName Filter from TBankBranchDetails TB   join TBank TBK on TB.BankId=TBK.BankId Where TB.Employerid=@Employerid and TBK.Bankname is not null and TB.BranchName<>''


SELECT TOP 10 CountryOfEmployment FROM TEmployee WHERE EmployeeId = 1431

