-- =============================================================================
-- bulk-employee-creation/seed-and-test-large.sql
--
-- Purpose:  Volume/performance stress test for the Bulk Employee Creation
--           processing pipeline - 1,000+ new hires chunked into @NumBatches
--           batches of @BatchSize each, timed per batch. The target SP
--           processes one record at a time via a cursor (RBAR, not
--           set-based) inside a single named transaction per record - this
--           script measures how that scales, it is NOT primarily about
--           correctness (see seed-and-test-small.sql for that).
--
--           See ..\bulk-profile-update\seed-and-test-large.sql for the Bulk
--           Profile Update equivalent.
--
-- When to use: before/after a change to the RBAR cursor loop, an index, or
--           anything you expect to affect throughput on a large upload - to
--           get an actual duration number instead of guessing.
--
-- Inputs:   @EmployerID, @LoginId, @RunTag - see ..\bulk-profile-update\
--           seed-and-test-small.sql; same meaning here.
--           @BatchSize / @NumBatches - default 100 x 10 = 1,000 new hires.
--           Increase @NumBatches for a bigger run; each batch's duration
--           prints as it completes so you can watch it live.
--
-- !! THIS SCRIPT WRITES DATA, AT VOLUME !! Same caveats as
--    ..\bulk-profile-update\seed-and-test-small.sql, multiplied: 1,000+
--    brand-new employees on *@seedtest.invalid. Confirm non-prod before
--    running (dev at the time this was written: IN-SVR-DBDEVHRM). This
--    will take real wall-clock time (RBAR cursors, one named transaction
--    per record) - that duration IS the measurement, don't mistake it for
--    the script hanging.
--
-- Notes:    - JSON batches are built with FOR JSON PATH, same technique as
--            seed-and-test-medium.sql (this folder).
--           - Use cleanup-bulk-upload-seed-test-data.sql afterward - it
--            matches on @RunTag/@seedtest.invalid regardless of volume.
-- =============================================================================

DECLARE @IReallyWantToRun BIT = 0;   -- <<< set to 1 after reading the header above
DECLARE @EmployerID INT = 10;        -- <<< test tenant
DECLARE @LoginId INT = 30715;        -- <<< acting user (real EmployeeID at EmployerID=10)
DECLARE @RunTag VARCHAR(20) = 'SEEDLG';
DECLARE @BatchSize INT = 100;
DECLARE @NumBatches INT = 10;        -- 100 x 10 = 1,000 new hires

IF @IReallyWantToRun = 0
BEGIN
    RAISERROR('Read the header above first. This script writes real data, AT VOLUME, for EmployerID=%d. Set @IReallyWantToRun = 1 to proceed.', 16, 1, @EmployerID);
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
DECLARE @CreationRunStart DATETIME2 = SYSDATETIME();
DECLARE @CreationBatchStart DATETIME2;

WHILE @c <= @NumBatches
BEGIN
    SET @CreationBatchStart = SYSDATETIME();
    DECLARE @CreationData NVARCHAR(MAX);

    ;WITH Seq AS (
        SELECT TOP (@BatchSize) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    SELECT @CreationData = (
        SELECT
            'True' AS [isValid],
            'SeedLg' AS [First Name],
            'QA' AS [Middle Name],
            ('Hire' + CAST(@c AS VARCHAR(3)) + '_' + CAST(s.n AS VARCHAR(4))) AS [Last Name],
            'American' AS [Nationality],
            ('seedlg.' + @RunTag + '.' + CAST(@c AS VARCHAR(3)) + '.' + CAST(s.n AS VARCHAR(4)) + '@seedtest.invalid') AS [Work Email]
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

    PRINT 'Bulk Creation batch ' + CAST(@c AS VARCHAR(3)) + '/' + CAST(@NumBatches AS VARCHAR(3))
        + ' (' + CAST(@BatchSize AS VARCHAR(5)) + ' records) took '
        + CAST(DATEDIFF(MILLISECOND, @CreationBatchStart, SYSDATETIME()) AS VARCHAR(10)) + ' ms.';
    SET @c += 1;
END

PRINT 'Bulk Employee Creation total: ' + CAST(@BatchSize * @NumBatches AS VARCHAR(6)) + ' records in '
    + CAST(DATEDIFF(MILLISECOND, @CreationRunStart, SYSDATETIME()) AS VARCHAR(10)) + ' ms.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

PRINT '--- Upload header status ---';
SELECT UploadID, UploadType, Status, DocumentID
FROM TEmployeeDetail_Upload
WHERE UploadID = @CreationUploadID;

PRINT '--- Section counters ---';
SELECT UploadSectionID, UploadID, Total, Valid, Processed, UnProcessed
FROM TEmployeeDetail_Upload_Section
WHERE UploadID = @CreationUploadID;

PRINT '--- Volume sanity: how many of the new hires actually landed in TEmployee ---';
SELECT COUNT(*) AS NewEmployeesCreated
FROM TEmployee
WHERE EmailID LIKE 'seedlg.' + @RunTag + '.%@seedtest.invalid';
PRINT 'Expect ' + CAST(@BatchSize * @NumBatches AS VARCHAR(6)) + '.';
