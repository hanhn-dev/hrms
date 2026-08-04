EXEC SP_GetAssetsList 10

EXEC dbo.SP_GetPendingAssets 1430

EXEC USP_ASSET_GetExistanceCategoryAssetcode 'HA2', 10, 1402

SELECT * FROM TRegisterAssets WHERE CategoryId = 1402