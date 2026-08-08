/* =============================================================================
   Fix "Input string was not in a correct format" on My Details
   (PersonalInformation.aspx) for a tenant seeded without CountryOfEmployment.

   BindEmpSummary does:
     Convert.ToInt32(employeeInfo.Rows[0]["CountryOfEmployment"].ToString())
   when the column is not null. DBNull still passes the != null check, and
   DBNull.ToString() is "" -- which throws FormatException and leaves
   Employee Name / Employment Number blank.

   Sets TEmployee.CountryOfEmployment from the employer's CountryId (cloned
   from the template into TEmployerDetails), falling back to the employee's
   Location.CountryId when present.

   Edit @CustId, then run.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @CustId     VARCHAR(10) = 'C00232';
DECLARE @EmployerId INT =
    (SELECT Employerid FROM dbo.TEmployerDetails WHERE custid = @CustId);

IF @EmployerId IS NULL
    THROW 50000, 'Employer not found for that custid.', 1;

DECLARE @EmployerCountryId INT =
    (SELECT CountryId FROM dbo.TEmployerDetails WHERE Employerid = @EmployerId);

IF @EmployerCountryId IS NULL
    SET @EmployerCountryId = 99;

UPDATE e
SET e.CountryOfEmployment = COALESCE(loc.CountryId, @EmployerCountryId)
FROM dbo.TEmployee e
LEFT JOIN dbo.TEmployeeInfo ei
    ON ei.EmployeeId = e.EmployeeId AND ei.EmployerID = e.Employerid
LEFT JOIN dbo.TLocation loc
    ON loc.LocationId = ei.LocationId AND loc.Employerid = e.Employerid
WHERE e.Employerid = @EmployerId
  AND e.CountryOfEmployment IS NULL;

PRINT 'Updated CountryOfEmployment on ' + CAST(@@ROWCOUNT AS VARCHAR(10))
    + ' TEmployee row(s) for Employerid ' + CAST(@EmployerId AS VARCHAR(10))
    + ' (custid ' + @CustId + ', fallback CountryId='
    + CAST(@EmployerCountryId AS VARCHAR(10)) + ').';

SELECT TOP 5 e.EmployeeId, e.EmailID, e.CountryOfEmployment, ei.EmploymentNumber, loc.CountryId AS LocationCountryId
FROM dbo.TEmployee e
JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
LEFT JOIN dbo.TLocation loc ON loc.LocationId = ei.LocationId AND loc.Employerid = e.Employerid
WHERE e.Employerid = @EmployerId
ORDER BY e.EmployeeId;
