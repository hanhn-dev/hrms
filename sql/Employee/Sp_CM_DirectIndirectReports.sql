DECLARE 
  @EmployeeId INT = 1431,
  @RankLevel INT = -3,-- -1 Self  0 Direct Reportee 1-- Indirect  -2 -- All(Direct+Indirect) -3 all employees for HR and Admin role
  @IsActive CHAR(1) = 'Y', --Y =Active ,N=InActive,Null=Active And InActive 
  @EmployerId INT = 10;


EXEC Sp_CM_DirectIndirectReports @EmployeeId, @RankLevel, @IsActive, @EmployerId

SELECT TOP 10 * FROM TEmployee WHERE Employerid = 10
SELECT TOP 10 * FROM TEmployeeInfo WHERE EmployerId = 10