-- Check customer license by EmployerId and/or CustomerNumber (custid).
-- Set one or both parameters; NULL parameters are ignored.
-- License rows are stored against the RootEmployerId; child org IDs resolve up.
DECLARE @EmployerId INT = 10,                 -- e.g. 10
        @CustomerNumber VARCHAR(25) = NULL;     -- e.g. 'C00010'

DECLARE @RootEmployerId INT,
        @ResolvedEmployerId INT,
        @ResolvedCustId VARCHAR(25),
        @EmployerName VARCHAR(200),
        @Today DATE = CAST(GETDATE() AS DATE);

-- Resolve employer from either input
SELECT TOP (1)
    @ResolvedEmployerId = ED.EmployerId,
    @RootEmployerId = ED.RootEmployerId,
    @ResolvedCustId = ED.Custid,
    @EmployerName = ED.EmployerName
FROM dbo.TEmployerDetails AS ED WITH (NOLOCK)
WHERE
    (
        (@EmployerId IS NOT NULL AND ED.EmployerId = @EmployerId)
        OR (@CustomerNumber IS NOT NULL AND ED.Custid = @CustomerNumber)
    );

IF @ResolvedEmployerId IS NULL
BEGIN
    SELECT
        0 AS IsFound,
        'No employer matched the given EmployerId / CustomerNumber.' AS Message;
    RETURN;
END;

-- 1) Employer context + TLicence (authoritative cloud/on-prem license record)
SELECT
    @ResolvedEmployerId AS InputEmployerId,
    @ResolvedCustId AS CustomerNumber,
    @EmployerName AS EmployerName,
    @RootEmployerId AS RootEmployerId,
    ED.LicenseCount AS EmployerLicenseCount,
    ED.LicenseKey AS EmployerLicenseKey,
    ED.IsActive AS EmployerIsActive,
    LI.LicenceID,
    LI.TotalLicence,
    LI.BufferLicence,
    ISNULL(LI.TotalLicence, 0) + ISNULL(LI.BufferLicence, 0) AS EffectiveLicence,
    LI.StartPeriod,
    LI.EndPeriod,
    IIF(LI.ProductLocation = 1, 'Cloud', IIF(LI.ProductLocation = 2, 'On Premise', CAST(LI.ProductLocation AS VARCHAR(10)))) AS ProductLocation,
    LI.LicenceStatus,
    CASE
        WHEN LI.LicenceID IS NULL THEN 'No TLicence row for root employer'
        WHEN LI.LicenceStatus = 'Inactive' THEN 'Inactive'
        WHEN LI.EndPeriod IS NOT NULL AND @Today > LI.EndPeriod THEN 'Expired'
        WHEN LI.StartPeriod IS NOT NULL AND @Today < LI.StartPeriod THEN 'Not yet started'
        ELSE 'Active window'
    END AS LicenceValidity,
    LI.ContactName,
    LI.ContactNumber,
    LI.EmailAddress,
    LI.CustSecondaryEmail,
    LI.AMName,
    LI.AMContactNumber,
    LI.AMPrimaryEmail,
    LI.AMSecondaryEmail,
    LI.Comment,
    LI.DocumentName,
    LI.CreatedWhen,
    LI.UpdatedWhen
FROM dbo.TEmployerDetails AS ED WITH (NOLOCK)
LEFT JOIN dbo.TLicence AS LI WITH (NOLOCK)
    ON LI.EmployerID = ED.EmployerId
WHERE ED.EmployerId = @RootEmployerId;

-- 2) Seat usage vs entitlement (active employees under the root org tree)
SELECT
    ISNULL(LI.TotalLicence, 0) + ISNULL(LI.BufferLicence, 0) AS EffectiveLicence,
    COUNT(DISTINCT TE.EmployeeId) AS TotalActiveEmployees,
    ISNULL(LI.TotalLicence, 0) + ISNULL(LI.BufferLicence, 0) - COUNT(DISTINCT TE.EmployeeId) AS RemainingSeats,
    CASE
        WHEN LI.LicenceID IS NULL THEN 'No licence record'
        WHEN COUNT(DISTINCT TE.EmployeeId) > ISNULL(LI.TotalLicence, 0) + ISNULL(LI.BufferLicence, 0)
            THEN 'Exceeded'
        ELSE 'Within limit'
    END AS SeatStatus
FROM dbo.TEmployerDetails AS RootED WITH (NOLOCK)
LEFT JOIN dbo.TLicence AS LI WITH (NOLOCK)
    ON LI.EmployerID = RootED.EmployerId
LEFT JOIN dbo.TEmployerDetails AS ChildED WITH (NOLOCK)
    ON ChildED.RootEmployerId = RootED.EmployerId
LEFT JOIN dbo.TEmployee AS TE WITH (NOLOCK)
    ON TE.Employerid = ChildED.EmployerId
   AND TE.IsActive IN ('Y', 'P')
LEFT JOIN dbo.TEmployeeInfo AS TEI WITH (NOLOCK)
    ON TEI.EmployeeId = TE.EmployeeId
WHERE RootED.EmployerId = @RootEmployerId
GROUP BY
    LI.LicenceID,
    LI.TotalLicence,
    LI.BufferLicence;

-- 3) Licensed modules on this licence (if any)
SELECT
    LI.LicenceID,
    HM.ModuleID,
    HM.ModuleName
FROM dbo.TLicence AS LI WITH (NOLOCK)
INNER JOIN dbo.TEmployerModule AS EM WITH (NOLOCK)
    ON EM.LicenceID = LI.LicenceID
INNER JOIN dbo.THrmsModules AS HM WITH (NOLOCK)
    ON HM.ModuleId = EM.HrmsModuleID
WHERE LI.EmployerID = @RootEmployerId
ORDER BY HM.ModuleName;

-- Alternative: production SPs (CustomerNumber / EmployerId only)
-- EXEC dbo.USP_TLicence_List @EmployerID = 10, @LicenceID = NULL;
-- EXEC dbo.USP_Licence_Validation @EmployerId = 10, @RequestType = NULL;
-- EXEC dbo.USP_GetLogo_InCloud 'C00010';   -- Cloud: seats from TLicence
-- EXEC dbo.USP_GetLogo 'C00010';           -- On-prem: seats from encrypted DefaultLogo
