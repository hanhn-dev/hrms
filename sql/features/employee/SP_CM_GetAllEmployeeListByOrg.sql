/* Get List of Employee which belongs to the same BU/Location as the given employee identifier */
DECLARE @EmployeeId INT = 1436,
        @EmployerId INT = 10,
        @CountryOfEmployment INT = 99;

EXEC SP_CM_GetAllEmployeeListByOrg_Clone @EmployerId, @EmployeeId, @CountryOfEmployment;

-- EXEC SP_CM_GetAllEmployeeListByOrg @EmployerId, @EmployeeId, @CountryOfEmployment;

