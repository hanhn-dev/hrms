-- =============================================================================
-- bulk-profile-update/seed-and-test-medium.sql
--
-- Purpose:  Seeds and processes a MULTI-BATCH Bulk Profile Update upload for
--           EmployerID=10 - ~100 records split across 5 batches, all against
--           the SAME UploadSectionID (mirrors how the app actually chunks
--           one section's data into several SP_BulkUpdateProfile_Process_
--           Template calls). This tier exists specifically to reproduce the
--           two defects from ..\rca-bulk-upload-unprocessed-records.md
--           (parent folder) that only show up ACROSS batches (the small
--           script's single-batch tests can't trigger these):
--             Pattern 4   - UnProcessed counter is OVERWRITTEN per batch, not
--                           accumulated, so it undercounts on multi-batch
--                           uploads (Processed correctly uses +=, UnProcessed
--                           uses a flat =).
--             Pattern 5/6 - re-running an already-processed (UploadID,
--                           Batchno, UploadSectionID) silently no-ops (empty
--                           result) yet can still flip Status to 'Processed'.
--
--           See ..\bulk-employee-creation\seed-and-test-medium.sql for the
--           Bulk Employee Creation equivalent.
--
-- When to use: after touching the batching/counter logic specifically, or
--           when small-tier tests pass but you suspect a multi-batch upload
--           in PROD is under/over-counting.
--
-- Inputs:   @EmployerID, @LoginId, @RunTag - see seed-and-test-small.sql
--           (this folder); same meaning here.
--           @BatchSize / @NumBatches - control volume (default 20 x 5 = 100
--           records).
--
-- !! THIS SCRIPT WRITES DATA !! Same caveats as seed-and-test-small.sql
--    (this folder): real writes to TEmployee for a pool of real
--    EmployeeIDs at EmployerID=10. Confirm you're on a non-prod database
--    before running (dev at the time this was written: IN-SVR-DBDEVHRM).
--    Read seed-and-test-small.sql's header for why there's no outer
--    transaction here either.
--
-- Notes:    - JSON batches are built with FOR JSON PATH from a generated
--            row set rather than hand-typed, so 100+ records stay accurate.
--            Column aliases become JSON keys directly - avoid literal dots
--            in an alias (FOR JSON PATH treats a dot as a nested path).
--           - Every batch seeds 2 intentionally-bad records (Date of Birth =
--            'NOT-A-DATE') among the valid ones, so every batch has a
--            non-zero, known UnProcessed count to compare against the final
--            stored counter.
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

DECLARE @EmployeePool TABLE (RowNum INT IDENTITY(1,1), EmployeeId INT);
INSERT INTO @EmployeePool (EmployeeId)
SELECT TOP 20 EmployeeID FROM TEmployeeInfo WHERE EmployerID = @EmployerID ORDER BY EmployeeID DESC;
DECLARE @PoolSize INT = @@ROWCOUNT;

DECLARE @UpdateUploadID INT;

INSERT INTO TEmployeeDetail_Upload
    (EmployerID, CountryID, DocumentID, IsQueue, CreatedBy, Status, IsShowData, UploadType)
VALUES
    (@EmployerID, 0, @RunTag + '-BPU', 0, @LoginId, 'Created', 1, 'BulkProfileUpdate');

SET @UpdateUploadID = SCOPE_IDENTITY();
PRINT 'Bulk Profile Update UploadID = ' + CAST(@UpdateUploadID AS VARCHAR(10));

DECLARE @UploadSectionID_Personal INT;

INSERT INTO TEmployeeDetail_Upload_Section
    (UploadID, SectionID, Fields, Total, Valid, InValid, CreatedBy, CreateDate)
VALUES
    (@UpdateUploadID, @SectionID_Personal,
     'First Name,Middle Name,Last Name,Nationality,Date of Birth',
     @BatchSize * @NumBatches, @BatchSize * @NumBatches, 0, @LoginId, GETDATE());

SET @UploadSectionID_Personal = SCOPE_IDENTITY();

DECLARE @b INT = 1;
DECLARE @KnownUnprocessedTotal INT = 0;   -- sum of the 2-per-batch bad records we deliberately seeded

WHILE @b <= @NumBatches
BEGIN
    DECLARE @EmployeeData NVARCHAR(MAX);

    ;WITH Seq AS (
        SELECT TOP (@BatchSize) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    SELECT @EmployeeData = (
        SELECT
            p.EmployeeId AS [ID],
            'True' AS [isValid],
            'SeedMed' AS [First Name],
            'QA' AS [Middle Name],
            ('B' + CAST(@b AS VARCHAR(3)) + 'R' + CAST(s.n AS VARCHAR(3))) AS [Last Name],
            'American' AS [Nationality],
            CASE WHEN s.n <= 2 THEN 'NOT-A-DATE' ELSE NULL END AS [Date of Birth]
        FROM Seq s
        INNER JOIN @EmployeePool p ON p.RowNum = ((s.n + @b) % @PoolSize) + 1
        FOR JSON PATH
    );

    -- EXEC parameters accept only a constant or a variable, not an inline
    -- expression, so the "is this the last batch" flag is computed first.
    DECLARE @IsLastBatch BIT;
    SET @IsLastBatch = CASE WHEN @b = @NumBatches THEN 1 ELSE 0 END;

    EXEC dbo.SP_BulkUpdateProfile_Process_Template
        @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = @b,
        @UploadSectionID = @UploadSectionID_Personal, @SectionID = @SectionID_Personal,
        @EmployeeData = @EmployeeData,
        @FieldList = 'First Name,Middle Name,Last Name,Nationality,Date of Birth',
        @Isdone = @IsLastBatch;

    SET @KnownUnprocessedTotal += 2;
    PRINT 'Personal Details batch ' + CAST(@b AS VARCHAR(3)) + ' of ' + CAST(@NumBatches AS VARCHAR(3)) + ' done.';
    SET @b += 1;
END

-- Pattern 5/6: replay the LAST batch again unchanged (same UploadID/Batchno/
-- UploadSectionID) - the guard inside SP_BulkUpdateProfile_Process_Template
-- should skip all section dispatch, but the code path after the guard still
-- inserts a second TProcessedBatchResult row and can still flip Status.
DECLARE @ReplayEmployeeData NVARCHAR(MAX);
SELECT @ReplayEmployeeData = (
    SELECT TOP 1 p.EmployeeId AS [ID], 'True' AS [isValid], 'SeedMed' AS [First Name], 'QA' AS [Middle Name], 'ReplayShouldNotRun' AS [Last Name], 'American' AS [Nationality]
    FROM @EmployeePool p
    FOR JSON PATH
);

EXEC dbo.SP_BulkUpdateProfile_Process_Template
    @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = @NumBatches,
    @UploadSectionID = @UploadSectionID_Personal, @SectionID = @SectionID_Personal,
    @EmployeeData = @ReplayEmployeeData,
    @FieldList = 'First Name,Middle Name,Last Name,Nationality',
    @Isdone = 1;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

PRINT '--- Upload header status ---';
SELECT UploadID, UploadType, Status, DocumentID
FROM TEmployeeDetail_Upload
WHERE UploadID = @UpdateUploadID;

PRINT '--- Per-batch results - sum these UnProcessed counts by hand ---';
SELECT UploadID, UploadSectionID, BatchNumber, Result, Status
FROM TProcessedBatchResult
WHERE UploadID = @UpdateUploadID AND UploadSectionID = @UploadSectionID_Personal
ORDER BY BatchNumber;

PRINT '--- Stored section counter (Pattern 4 check) ---';
SELECT UploadSectionID, Total, Valid, Processed, UnProcessed
FROM TEmployeeDetail_Upload_Section
WHERE UploadSectionID = @UploadSectionID_Personal;
PRINT 'We seeded 2 deliberately-bad records in EACH of ' + CAST(@NumBatches AS VARCHAR(3)) + ' batches = ' + CAST(@KnownUnprocessedTotal AS VARCHAR(3)) + ' true UnProcessed records total.';
PRINT 'If UnProcessed above equals 2 (not ' + CAST(@KnownUnprocessedTotal AS VARCHAR(3)) + '), the counter was overwritten by the last batch instead of accumulated - Pattern 4 confirmed.';

PRINT '--- Pattern 5/6 check: did the replay batch produce a second row / did Status stay Processed after a no-op? ---';
SELECT UploadID, UploadSectionID, BatchNumber, Result, Status
FROM TProcessedBatchResult
WHERE UploadID = @UpdateUploadID AND UploadSectionID = @UploadSectionID_Personal AND BatchNumber = @NumBatches
ORDER BY ProcessedBatchResultID;
PRINT 'Expect TWO rows for BatchNumber = ' + CAST(@NumBatches AS VARCHAR(3)) + ': the real run, then the replay with Result = [].';
