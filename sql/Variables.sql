DECLARE @TestCloud INT = 10,
        @Zuniga INT = 1436;



/** USP_ASSET_InsertRegisterAsset **/
DECLARE 
    @RegisterAssetId INT = 0,
    @CategoryId INT = 1401,
    @AssetCode VARCHAR(100) = 'M1',
    @DateOfPurchase DATETIME = '2024-02-24',
    @VendorName VARCHAR(100) = 'Dell',
    @VendorDetails VARCHAR(100) = NULL,
    @AssetCost DECIMAL(9,2) = 2000,
    @WarrantyEndDate DATETIME = '2026-02-24',
    @Brand VARCHAR(100) = 'Dell',
    @ModelSeries VARCHAR(100) = 'ABC',
    @SerialNumber VARCHAR(100) = 'ABCDEF',
    @DeviceConfiguration VARCHAR(100) = '123456',
    @HostName VARCHAR(100) = '',
    @AssetStatus VARCHAR(100) = 'Not Working',
    @AssetDescription VARCHAR(100) = NULL,
    @FilePath VARCHAR(100) = '',
    @Comments VARCHAR(100) = '',
    @EffectiveDate DATETIME = NULL,
    @EffectiveBy VARCHAR(100) = NULL,
    @IsActive BIT = 0,
    @IsDelete VARCHAR(100) = '',
    @CreatedBy INT = 1431,
    @EmployerId INT = 10,
    @CurrencyCodeId INT = 99;