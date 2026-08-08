DECLARE @RequestId INT = 4100,
        @UploadTemplateId INT = 5;

EXEC SP_GetTempTableGridData @RequestId, @UploadTemplateId