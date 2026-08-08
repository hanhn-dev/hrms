DECLARE @DefaultLogoId INT
  ,@IsOnPremise BIT

EXECUTE Sp_OpenEncryptionKeysNew;

SELECT @DefaultLogoId = dbo.Fn_DecryptDataNew(s.[DefaultLogo])
		, @IsOnPremise = IsOnPremise
FROM dbo.TCustomerSettings AS s WITH (NOLOCK)
WHERE Employerid = 10
--'C00010'

EXECUTE SP_CloseEncryptionKeyNew;

SELECT @DefaultLogoId AS NumberOfLicences, @IsOnPremise AS IsOnPremise

SELECT IsOnPremise, * FROM TCustomerSettings WHERE EmployerId = 71

-- To Get Number of Licences for OnPremise (The `Logo` names are quite confused but using for checking Licences)
EXEC USP_GetLogo 'C00071'

-- To Get Number of Licences for Cloud (The `Logo` names are quite confused but using for checking Licences)
EXEC USP_GetLogo_InCloud 'C00024'

