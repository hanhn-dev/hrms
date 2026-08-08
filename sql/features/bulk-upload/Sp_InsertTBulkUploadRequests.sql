DECLARE @EmployeeId INT = 1431,
		@EmployerId INT = 10,
		@UploadTemplateId INT = 5,
		@UploadFilePath VARCHAR(500) = 'D:\Websites\HRMSDocs\HRM-CL-Prod\ClientOnboarding\',
		@IsPartiallyDataProcess BIT = 1;


EXEC Sp_InsertTBulkUploadRequests @EmployeeId, @EmployerId, @UploadTemplateId, @UploadFilePath, @IsPartiallyDataProcess
