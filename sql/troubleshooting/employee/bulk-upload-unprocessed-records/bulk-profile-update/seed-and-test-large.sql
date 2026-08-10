-- =============================================================================
-- bulk-profile-update/seed-and-test-large.sql
--
-- Purpose:  Volume/performance stress test for the Bulk Profile Update
--           processing pipeline - 1,000+ records chunked into @NumBatches
--           batches of @BatchSize each, timed per batch. The target SP
--           processes one record at a time via a cursor (RBAR, not
--           set-based) inside a single named transaction per record - this
--           script measures how that scales, it is NOT primarily about
--           correctness (see seed-and-test-small.sql for that). A single
--           light defect check runs at the end purely to confirm the known
--           defect (..\rca-bulk-upload-unprocessed-records.md, pattern 1)
--           still surfaces at this volume, not to explore it in depth.
--
--           See ..\bulk-employee-creation\seed-and-test-large.sql for the
--           Bulk Employee Creation equivalent.
--
-- When to use: before/after a change to the RBAR cursor loop, an index, or
--           anything you expect to affect throughput on a large upload - to
--           get an actual duration number instead of guessing.
--
-- Inputs:   @EmployerID, @LoginId, @RunTag - see seed-and-test-small.sql
--           (this folder); same meaning here.
--           @BatchSize / @NumBatches - default 100 x 10 = 1,000 records.
--           Increase @NumBatches for a bigger run; each batch's duration
--           prints as it completes so you can watch it live.
--
-- !! THIS SCRIPT WRITES DATA, AT VOLUME !! Same caveats as seed-and-test-
--    small.sql (this folder), multiplied: 1,000+ real TEmployee updates
--    cycling through a pool of real EmployeeIDs at EmployerID=10.
--    Confirm non-prod before running (dev at the time this was written:
--    IN-SVR-DBDEVHRM). This will take real wall-clock time (RBAR cursors,
--    one named transaction per record) - that duration IS the measurement,
--    don't mistake it for the script hanging.
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
DECLARE @NumBatches INT = 10;        -- 100 x 10 = 1,000 records

IF @IReallyWantToRun = 0
BEGIN
    RAISERROR('Read the header above first. This script writes real data, AT VOLUME, for EmployerID=%d. Set @IReallyWantToRun = 1 to proceed.', 16, 1, @EmployerID);
    RETURN;
END

DECLARE @SectionID_Personal INT = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section = 'Personal Details');

DECLARE @EmployeePool TABLE (RowNum INT IDENTITY(1,1), EmployeeId INT);
INSERT INTO @EmployeePool (EmployeeId)
SELECT TOP 50 EmployeeID FROM TEmployeeInfo WHERE EmployerID = @EmployerID ORDER BY EmployeeID DESC;
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
     'First Name,Middle Name,Last Name,Nationality',
     @BatchSize * @NumBatches, @BatchSize * @NumBatches, 0, @LoginId, GETDATE());

SET @UploadSectionID_Personal = SCOPE_IDENTITY();

DECLARE @b INT = 1;
DECLARE @RunStart DATETIME2 = SYSDATETIME();
DECLARE @BatchStart DATETIME2;

WHILE @b <= @NumBatches
BEGIN
    SET @BatchStart = SYSDATETIME();
    DECLARE @EmployeeData NVARCHAR(MAX);

    ;WITH Seq AS (
        SELECT TOP (@BatchSize) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    SELECT @EmployeeData = (
        SELECT
            p.EmployeeId AS [ID],
            'True' AS [isValid],
            'SeedLg' AS [First Name],
            'QA' AS [Middle Name],
            ('B' + CAST(@b AS VARCHAR(3)) + 'R' + CAST(s.n AS VARCHAR(4))) AS [Last Name],
            'American' AS [Nationality]
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
        @FieldList = 'First Name,Middle Name,Last Name,Nationality',
        @Isdone = @IsLastBatch;

    PRINT 'Personal Details batch ' + CAST(@b AS VARCHAR(3)) + '/' + CAST(@NumBatches AS VARCHAR(3))
        + ' (' + CAST(@BatchSize AS VARCHAR(5)) + ' records) took '
        + CAST(DATEDIFF(MILLISECOND, @BatchStart, SYSDATETIME()) AS VARCHAR(10)) + ' ms.';
    SET @b += 1;
END

PRINT 'Bulk Profile Update total: ' + CAST(@BatchSize * @NumBatches AS VARCHAR(6)) + ' records in '
    + CAST(DATEDIFF(MILLISECOND, @RunStart, SYSDATETIME()) AS VARCHAR(10)) + ' ms.';

-- =============================================================================
-- LIGHT DEFECT SANITY CHECK - confirm pattern 1 still surfaces at this
-- volume (see seed-and-test-small.sql, this folder, for the full
-- explanation; this is a single quick re-check, not exploration).
-- =============================================================================

DECLARE @DefectCheckBatchno INT = @NumBatches + 1;
DECLARE @DefectCheckData NVARCHAR(MAX) = N'[
{"ID":' + CAST((SELECT TOP 1 EmployeeId FROM @EmployeePool) AS VARCHAR(10)) + N',"isValid":"True","First Name":"SeedLgBad","Middle Name":"QA","Last Name":"BadDOBAtVolume","Nationality":"American","Date of Birth":"NOT-A-DATE"},
{"ID":' + CAST((SELECT TOP 1 EmployeeId FROM @EmployeePool WHERE RowNum = 2) AS VARCHAR(10)) + N',"isValid":"True","First Name":"SeedLgOk","Middle Name":"QA","Last Name":"OkAtVolume","Nationality":"American"}
]';

EXEC dbo.SP_BulkUpdateProfile_Process_Template
    @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = @DefectCheckBatchno,
    @UploadSectionID = @UploadSectionID_Personal, @SectionID = @SectionID_Personal,
    @EmployeeData = @DefectCheckData,
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Date of Birth',
    @Isdone = 1;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

PRINT '--- Upload header status ---';
SELECT UploadID, UploadType, Status, DocumentID
FROM TEmployeeDetail_Upload
WHERE UploadID = @UpdateUploadID;

PRINT '--- Section counters ---';
SELECT UploadSectionID, UploadID, Total, Valid, Processed, UnProcessed
FROM TEmployeeDetail_Upload_Section
WHERE UploadID = @UpdateUploadID;

PRINT '--- Defect sanity check batch result (last batch) ---';
SELECT UploadID, UploadSectionID, BatchNumber, Result
FROM TProcessedBatchResult
WHERE UploadID = @UpdateUploadID AND BatchNumber = @DefectCheckBatchno;
PRINT 'CONTROL check: this batch''s valid record must show up as a real change on TEmployee, else the fixture is broken.';
PRINT 'Pattern 1 (poisoned cursor) still applies: expect the single valid record in this batch to ALSO show up as UnProcessed above.';
