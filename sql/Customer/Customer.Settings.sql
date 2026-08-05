-- Get customer settings by EmployerId and/or CustomerNumber (CustomerId).
-- Set one or both parameters; NULL parameters are ignored.
DECLARE @EmployerId INT = 10,                 -- e.g. 10
        @CustomerNumber VARCHAR(25) = NULL;     -- e.g. 'C00010'

-- Employer context + all tenant settings (CS.* includes CustomerId / EmployerId)
SELECT
    ED.EmployerName,
    ED.Custid AS EmployerCustId,
    ED.ParentEmployerId,
    ED.IsActive AS EmployerIsActive,
    CS.*
FROM dbo.TCustomerSettings AS CS WITH (NOLOCK)
LEFT JOIN dbo.TEmployerDetails AS ED WITH (NOLOCK)
    ON ED.Employerid = CS.EmployerId
WHERE
    (
        (@EmployerId IS NOT NULL AND CS.EmployerId = @EmployerId)
        OR (@CustomerNumber IS NOT NULL AND CS.CustomerId = @CustomerNumber)
    );

-- Alternative: shaped result from the production SP (CustomerNumber only)
-- EXEC dbo.SP_GetCustomerSettings @CustomerNumber;
