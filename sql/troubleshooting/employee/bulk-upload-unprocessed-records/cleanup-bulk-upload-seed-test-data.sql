-- =============================================================================
-- cleanup-bulk-upload-seed-test-data.sql
--
-- Purpose:  Removes what seed-and-test-bulk-upload-small/medium/large.sql
--           created, and reports (does NOT auto-revert) what they changed on
--           pre-existing employees.
--
-- What gets DELETED (fully reversible - these rows only ever existed because
-- the seed scripts created them):
--   - TEmployee rows for the brand-new Bulk Creation test hires
--     (EmailID LIKE '%@seedtest.invalid').
--   - TEmployeeDetail_Upload / TEmployeeDetail_Upload_Section /
--     TProcessedBatchResult rows tagged with DocumentID LIKE 'SEEDSM-%',
--     'SEEDMED-%', or 'SEEDLG-%'.
--
-- What gets REPORTED ONLY (cannot be auto-reverted - these were pre-existing
-- real employees at EmployerID=10 before any seed script ran; the seed
-- scripts overwrote a few text fields on them, e.g. Last Name/Nationality):
--   - Any TEmployee row whose FName starts with 'SeedSm', 'SeedMed', or
--     'SeedLg' - the seed scripts always use one of those exact prefixes,
--     so this should never false-positive against a real employee's name.
--   - If you need the original values back, they are NOT captured anywhere
--     by this script or the seed scripts - restore from a backup/snapshot of
--     TEmployee if that ever matters on whichever database this runs against.
--
-- Inputs:   @EmployerID - defaults to 10, matches the seed scripts.
--
-- !! THIS SCRIPT DELETES DATA !! Read the "what gets DELETED" list above.
--    Confirm you're on a non-prod database before running.
-- =============================================================================

DECLARE @IReallyWantToRun BIT = 0;   -- <<< set to 1 after reading the header above
DECLARE @EmployerID INT = 10;        -- <<< test tenant, matches the seed scripts

IF @IReallyWantToRun = 0
BEGIN
    RAISERROR('Read the header above first. This script deletes seed test data for EmployerID=%d. Set @IReallyWantToRun = 1 to proceed.', 16, 1, @EmployerID);
    RETURN;
END

BEGIN TRANSACTION CleanupSeedTestData;

BEGIN TRY

    -- --- Brand-new Bulk Creation test employees -----------------------------
    DECLARE @DeletedEmployees INT;

    DELETE FROM TEmployee
    WHERE EmployerId = @EmployerID
      AND EmailID LIKE '%@seedtest.invalid';
    SET @DeletedEmployees = @@ROWCOUNT;
    PRINT 'Deleted ' + CAST(@DeletedEmployees AS VARCHAR(10)) + ' seed-created TEmployee row(s).';

    -- --- Seed upload rows (all tiers) ----------------------------------------
    DECLARE @SeedUploadIDs TABLE (UploadID INT);
    INSERT INTO @SeedUploadIDs (UploadID)
    SELECT UploadID
    FROM TEmployeeDetail_Upload
    WHERE EmployerID = @EmployerID
      AND (DocumentID LIKE 'SEEDSM-%' OR DocumentID LIKE 'SEEDMED-%' OR DocumentID LIKE 'SEEDLG-%');

    DELETE FROM TProcessedBatchResult
    WHERE UploadID IN (SELECT UploadID FROM @SeedUploadIDs);
    PRINT 'Deleted ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' TProcessedBatchResult row(s).';

    DELETE FROM TEmployeeDetail_Upload_Section
    WHERE UploadID IN (SELECT UploadID FROM @SeedUploadIDs);
    PRINT 'Deleted ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' TEmployeeDetail_Upload_Section row(s).';

    DELETE FROM TEmployeeDetail_Upload
    WHERE UploadID IN (SELECT UploadID FROM @SeedUploadIDs);
    PRINT 'Deleted ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' TEmployeeDetail_Upload row(s).';

    COMMIT TRANSACTION CleanupSeedTestData;
    PRINT 'Cleanup committed.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION CleanupSeedTestData;
    PRINT 'Cleanup failed and was rolled back: ' + ERROR_MESSAGE();
END CATCH

-- =============================================================================
-- REPORT ONLY - pre-existing employees still carrying test values
-- =============================================================================

SELECT EmployeeId, FName, MiddleName, LName, Nationality, BirthZipCode, DoB
FROM TEmployee
WHERE EmployerId = @EmployerID
  AND (FName LIKE 'SeedSm%' OR FName LIKE 'SeedMed%' OR FName LIKE 'SeedLg%');

PRINT 'The rows above are REAL, pre-existing employees the seed scripts updated - not deleted (no original values were captured to revert to).';
