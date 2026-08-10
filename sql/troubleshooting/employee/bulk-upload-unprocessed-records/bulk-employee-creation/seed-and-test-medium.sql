-- =============================================================================
-- bulk-employee-creation/seed-and-test-medium.sql
--
-- Purpose:  Seeds and processes a MULTI-BATCH Bulk Employee Creation upload
--           for EmployerID=10 - ~100 new hires split across 5 batches, all
--           against the SAME UploadSectionID (mirrors how the app actually
--           chunks one section's data into several SP_BulkCreationProfile_
--           Process_Template calls), plus a duplicate-email retry across
--           batches (RCA pattern 3).
--
--           See ..\bulk-profile-update\seed-and-test-medium.sql for the Bulk
--           Profile Update equivalent (patterns 4 and 5/6, which need this
--           multi-batch setup specifically).
--
-- When to use: after touching the batching logic specifically, or as a
--           medium-volume functional check on the creation path.
--
-- Inputs:   @EmployerID, @LoginId, @RunTag - see ..\bulk-profile-update\
--           seed-and-test-small.sql; same meaning here.
--           @BatchSize / @NumBatches - control volume (default 20 x 5 = 100
--           new hires).
--
-- !! THIS SCRIPT WRITES DATA !! ~100 brand-new employees on
--    *@seedtest.invalid. Confirm you're on a non-prod database before
--    running (dev at the time this was written: IN-SVR-DBDEVHRM). Read
--    ..\bulk-profile-update\seed-and-test-small.sql's header for why there's
--    no outer transaction here either.
--
-- Notes:    - JSON batches are built with FOR JSON PATH from a generated
--            row set rather than hand-typed, so 100+ records stay accurate.
-- =============================================================================

DECLARE @IReallyWantToRun BIT = 0;   -- <<< set to 1 after reading the header above
DECLARE @EmployerID INT = 10;        -- <<< test tenant
DECLARE @LoginId INT = 30715;        -- <<< acting user (real EmployeeID at EmployerID=10)
DECLARE @RunTag VARCHAR(20) = 'SEEDMED';
DECLARE @BatchSize INT = 20;
DECLARE @NumBatches INT = 5;

IF @IReallyWantToRun = 0
BEGIN
    RAISERROR('Read the header above first. This script writes real data for EmployerID=%d. Set @IReallyWantToRun = 1 to proceed.', 16, 1, @EmployerID);
    RETURN;
END

DECLARE @SectionID_Personal INT = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section = 'Personal Details');

DECLARE @CreationUploadID INT;

INSERT INTO TEmployeeDetail_Upload
    (EmployerID, CountryID, DocumentID, IsQueue, CreatedBy, Status, IsShowData, UploadType)
VALUES
    (@EmployerID, 0, @RunTag + '-BEC', 0, @LoginId, 'Created', 1, 'BulkCreation');

SET @CreationUploadID = SCOPE_IDENTITY();
PRINT 'Bulk Employee Creation UploadID = ' + CAST(@CreationUploadID AS VARCHAR(10));

DECLARE @UploadSectionID_Creation INT;

INSERT INTO TEmployeeDetail_Upload_Section
    (UploadID, SectionID, Fields, Total, Valid, InValid, CreatedBy, CreateDate)
VALUES
    (@CreationUploadID, @SectionID_Personal,
     'First Name,Middle Name,Last Name,Nationality,Work Email',
     @BatchSize * @NumBatches, @BatchSize * @NumBatches, 0, @LoginId, GETDATE());

SET @UploadSectionID_Creation = SCOPE_IDENTITY();

DECLARE @c INT = 1;
DECLARE @FirstBatchEmail VARCHAR(100) = 'seedmed.' + @RunTag + '.1.1@seedtest.invalid';

WHILE @c <= @NumBatches
BEGIN
    DECLARE @CreationData NVARCHAR(MAX);

    ;WITH Seq AS (
        SELECT TOP (@BatchSize) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    SELECT @CreationData = (
        SELECT
            'True' AS [isValid],
            'SeedMed' AS [First Name],
            'QA' AS [Middle Name],
            ('Hire' + CAST(@c AS VARCHAR(3)) + '_' + CAST(s.n AS VARCHAR(3))) AS [Last Name],
            'American' AS [Nationality],
            ('seedmed.' + @RunTag + '.' + CAST(@c AS VARCHAR(3)) + '.' + CAST(s.n AS VARCHAR(3)) + '@seedtest.invalid') AS [Work Email]
        FROM Seq s
        FOR JSON PATH
    );

    -- EXEC parameters accept only a constant or a variable, not an inline
    -- expression, so the "is this the last batch" flag is computed first.
    DECLARE @IsLastBatch BIT;
    SET @IsLastBatch = CASE WHEN @c = @NumBatches THEN 1 ELSE 0 END;

    EXEC dbo.SP_BulkCreationProfile_Process_Template
        @UploadID = @CreationUploadID, @LoginId = @LoginId, @Batchno = @c,
        @UploadSectionID = @UploadSectionID_Creation, @SectionID = @SectionID_Personal,
        @EmployeeData = @CreationData,
        @FieldList = 'First Name,Middle Name,Last Name,Nationality,Work Email',
        @Isdone = @IsLastBatch;

    PRINT 'Bulk Creation batch ' + CAST(@c AS VARCHAR(3)) + ' of ' + CAST(@NumBatches AS VARCHAR(3)) + ' done.';
    SET @c += 1;
END

-- Duplicate-email retry across batches (reuses batch 1's first generated email)
DECLARE @DupRetryBatchno INT = @NumBatches + 1;
DECLARE @DupRetryData NVARCHAR(MAX) = N'[{"isValid":"True","First Name":"SeedMedDup","Middle Name":"QA","Last Name":"DupRetry","Nationality":"American","Work Email":"' + @FirstBatchEmail + N'"}]';

EXEC dbo.SP_BulkCreationProfile_Process_Template
    @UploadID = @CreationUploadID, @LoginId = @LoginId, @Batchno = @DupRetryBatchno,
    @UploadSectionID = @UploadSectionID_Creation, @SectionID = @SectionID_Personal,
    @EmployeeData = @DupRetryData,
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Work Email',
    @Isdone = 1;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

PRINT '--- Upload header status ---';
SELECT UploadID, UploadType, Status, DocumentID
FROM TEmployeeDetail_Upload
WHERE UploadID = @CreationUploadID;

PRINT '--- Bulk Creation volume sanity check ---';
SELECT COUNT(*) AS NewEmployeesCreated
FROM TEmployee
WHERE EmailID LIKE 'seedmed.' + @RunTag + '.%@seedtest.invalid';
PRINT 'Expect ' + CAST(@BatchSize * @NumBatches AS VARCHAR(5)) + ' (the duplicate-email retry should NOT add one more).';

SELECT COUNT(*) AS DuplicateEmailRowCount
FROM TEmployee
WHERE EmailID = @FirstBatchEmail;
PRINT 'Expect exactly 1 (pattern 3: the retry should have been rejected, not created a second row).';
