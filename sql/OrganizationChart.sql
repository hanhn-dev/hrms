DECLARE @EmployerID VARCHAR(50) = '10',
        @BusinessUnitID VARCHAR(50) = 0,
        @EmployeeID INT = 0;

EXEC SP_OrgChart @EmployerID, @BusinessUnitID, @EmployeeID


EXEC SP_TS_GetAllBusinessUnit @EmployerID
EXEC USP_GetEmpListByOrgBU @BusinessUnitID, @EmployerID

DECLARE @EmployerID VARCHAR(50) = '10',
        @BusinessUnitID VARCHAR(50) = '29',
        @EmployeeID INT = 10416;

EXEC SP_OrgChart @EmployerID, @BusinessUnitID, @EmployeeID


SELECT * FROM TEmployee WHERE EmployeeId = 1431

SET @EmployeeID = 1430
EXEC Usp_GetOrganisationAndBusinessUnit @EmployeeID
EXEC SP_GetEmployerList @EmployeeID

SELECT TOP 10 * FROM TEmployee E
INNER JOIN TEmployeeInfo EI ON E.EmployeeId = EI.EmployeeId


SELECT TOP 10 * FROM TEmployeeInfo

SELECT TOP 10 * From TBusinessCards
SELECT TOP 10 * FROM TEmployeeOrgBusinessHead
SELECT TOP 10 * FROM TORGChart WHERE EmployeeID = 1430
SELECT TOP 10 * FROM TOrgHierarchyDetails WHERE Employerid = 10

 EXEC SP_OrgChart @OrganizationIDs = 10, @BusinessUnitID = 14, @EmployeeID = 0
EXEC USP_GetEmpListByOrgBU @BusinessUnitID= 0, @OrganizationID = 10

SELECT * FROM TORGChart WHERE EmployeeID = 1430
UPDATE TORGChart SET ReportsTo = NULL WHERE Id = 1420 -- (Previous 1437)




  SELECT A.EmployeeId,A.ReportsTo,TE.EmployerId,EI.BusinessUnitId
    FROM TEmployee AS b
    JOIN  TORGChart AS a    ON a.EmployeeID = b.EmployeeId 
    JOIN TEmployeeInfo AS EI   ON EI.EmployeeId = a.EmployeeId
    JOIN TEmployerDetails AS TE  ON TE.EmployerId = EI.EmployerID
    WHERE b.IsActive = 'Y'
    and TE.EmployerId = 10
    order by a.EmployeeID


    SELECT a.*
       FROM TEmployee AS b
       JOIN  TORGChart AS a    ON a.EmployeeID = b.EmployeeId 
       JOIN TEmployeeInfo AS EI   ON EI.EmployeeId = a.EmployeeId
       JOIN TEmployerDetails AS TE  ON TE.EmployerId = EI.EmployerID
       WHERE b.IsActive = 'Y'
       and TE.EmployerId = 10