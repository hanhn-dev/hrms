-- =============================================================================
-- bulk-employee-creation/seed-and-test-small.sql
--
-- Purpose:  Seeds a small, hand-authored Bulk Employee Creation upload for
--           EmployerID=10, then drives the REAL processing stored procedure
--           directly (SP_BulkCreationProfile_Process_Template) so you can
--           confirm, with your own eyes on this DB, whether the processing
--           pipeline behaves correctly - and reproduce the specific defects
--           written up in ..\rca-bulk-upload-unprocessed-records.md
--           (parent folder):
--             Pattern 3  - ambiguous "Work Email Already Exists" message
--             Pattern 10 - NULL-poisoning via Language Read/Write/Speak lookup
--
--           See ..\bulk-profile-update\seed-and-test-small.sql for the
--           Bulk Profile Update equivalent (patterns 1, 10, 12, 13).
--
-- When to use: you changed something in this pipeline (or are about to) and
--           want a fast, readable, fully-explained functional check before
--           trusting it - not a volume/perf test (see the -medium/-large
--           scripts in this folder for that).
--
-- Inputs:   @EmployerID - test tenant. Defaults to 10 (dev: IN-SVR-DBDEVHRM).
--           @LoginId    - acting user stamped as CreatedBy/UpdatedBy on every
--                         row this script touches. Defaults to a real
--                         EmployeeID at EmployerID=10.
--           @RunTag     - short tag embedded in DocumentID / test emails so
--                         cleanup-bulk-upload-seed-test-data.sql can find
--                         everything this run created.
--
-- !! THIS SCRIPT WRITES DATA !!
--   - Calls the LIVE processing SP directly, which means brand-new employee
--     rows for the test emails (*@seedtest.invalid - reserved non-routable
--     domain, easy to find/clean).
--   - Run this against a non-prod database. Confirmed default connection at
--     the time this script was written resolves to IN-SVR-DBDEVHRM (dev).
--   - Nothing here is wrapped in an outer explicit transaction: the target
--     SP already manages its own named transaction per record internally,
--     and SQL Server does not allow naming/rolling back a transaction that
--     isn't the outermost one - wrapping our own transaction around these
--     calls would break on the very first per-record ROLLBACK. This matches
--     how the app itself calls this SP (no outer transaction either).
--   - Use cleanup-bulk-upload-seed-test-data.sql afterward - the new test
--     employees created here can be fully deleted (nothing pre-existing is
--     touched by this script).
--
-- Notes:    - Each EXEC below is a single call to the real processing SP,
--            passing a hand-built JSON batch as @EmployeeData - exactly the
--            shape the app itself builds, just typed by hand here.
--           - Test 5 (a plain, unremarkable new hire) is the control for
--            Tests 6 and 7: if Test 5's employee wasn't actually created,
--            the fixture is wrong and Tests 6/7 can't be meaningfully read.
--           - Field/column mappings below were confirmed live against
--            TEmployeeDetail_Fields for EmployerID=10 on 2026-08-09.
-- =============================================================================

DECLARE @IReallyWantToRun BIT = 0;   -- <<< set to 1 after reading the header above
DECLARE @EmployerID INT = 10;        -- <<< test tenant
DECLARE @LoginId INT = 30715;        -- <<< acting user (real EmployeeID at EmployerID=10)
DECLARE @RunTag VARCHAR(20) = 'SEEDSM';

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
    (UploadID, SectionID, Fields, Section_JSON, Total, Valid, InValid, CreatedBy, CreateDate)
VALUES
    (@CreationUploadID, @SectionID_Personal,
     'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Work Email,Language Read',
     '[{"isValid":"True","First Name":"SeedSmNew","Middle Name":"QA","Last Name":"Hire01","Nationality":"American","Zip Code of Birth":"10010","Work Email":"seedsm.hire01@seedtest.invalid"},{"isValid":"True","First Name":"SeedSmDup","Middle Name":"QA","Last Name":"Hire01Dup","Nationality":"American","Zip Code of Birth":"10010","Work Email":"seedsm.hire01@seedtest.invalid"},{"isValid":"True","First Name":"SeedSmLangNew","Middle Name":"QA","Last Name":"Hire02","Nationality":"American","Zip Code of Birth":"10011","Work Email":"seedsm.hire02@seedtest.invalid","Language Read":"Klingon"}]',
     3, 3, 0, @LoginId, GETDATE());

SET @UploadSectionID_Creation = SCOPE_IDENTITY();

-- Test 5 (CONTROL): new hire, fully valid. Expect a real new TEmployee row
-- for this email. Tests 6 and 7 below only mean something if this one
-- actually worked.
EXEC dbo.SP_BulkCreationProfile_Process_Template
    @UploadID = @CreationUploadID, @LoginId = @LoginId, @Batchno = 1,
    @UploadSectionID = @UploadSectionID_Creation, @SectionID = @SectionID_Personal,
    @EmployeeData = '[{"isValid":"True","First Name":"SeedSmNew","Middle Name":"QA","Last Name":"Hire01","Nationality":"American","Zip Code of Birth":"10010","Work Email":"seedsm.hire01@seedtest.invalid"}]',
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Work Email',
    @Isdone = 1;

-- Test 6: same Work Email again (RCA pattern 3 - the generic "Work Email
-- Already Exists" message can come from either of two different EXISTS
-- checks; this demonstrates the outcome, not which check fired).
EXEC dbo.SP_BulkCreationProfile_Process_Template
    @UploadID = @CreationUploadID, @LoginId = @LoginId, @Batchno = 2,
    @UploadSectionID = @UploadSectionID_Creation, @SectionID = @SectionID_Personal,
    @EmployeeData = '[{"isValid":"True","First Name":"SeedSmDup","Middle Name":"QA","Last Name":"Hire01Dup","Nationality":"American","Zip Code of Birth":"10010","Work Email":"seedsm.hire01@seedtest.invalid"}]',
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Work Email',
    @Isdone = 1;

-- Test 7: NULL-poisoning via bad Language Read on the CREATION path (same
-- underlying Ufn_BulkProfile_languageNamestoIds bug as the Bulk Profile
-- Update test, this time inside FN_BulkCreateProfile_BuildInsertDetailsSQL).
-- Expect: reported Processed / Work Email in the success JSON, but NO
-- TEmployee row actually created for seedsm.hire02@seedtest.invalid.
EXEC dbo.SP_BulkCreationProfile_Process_Template
    @UploadID = @CreationUploadID, @LoginId = @LoginId, @Batchno = 3,
    @UploadSectionID = @UploadSectionID_Creation, @SectionID = @SectionID_Personal,
    @EmployeeData = '[{"isValid":"True","First Name":"SeedSmLangNew","Middle Name":"QA","Last Name":"Hire02","Nationality":"American","Zip Code of Birth":"10011","Work Email":"seedsm.hire02@seedtest.invalid","Language Read":"Klingon"}]',
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Work Email,Language Read',
    @Isdone = 1;

-- =============================================================================
-- VERIFICATION - check the CONTROL row first. If it didn't create the
-- employee, stop there - the fixture is wrong, not the processing logic.
-- =============================================================================

PRINT '--- Upload header status ---';
SELECT UploadID, UploadType, Status, DocumentID
FROM TEmployeeDetail_Upload
WHERE UploadID = @CreationUploadID;

PRINT '--- Section counters ---';
SELECT UploadSectionID, UploadID, SectionID, Total, Valid, InValid, Processed, UnProcessed
FROM TEmployeeDetail_Upload_Section
WHERE UploadID = @CreationUploadID;

PRINT '--- Raw per-batch results ---';
SELECT UploadID, UploadSectionID, BatchNumber, Result, Status
FROM TProcessedBatchResult
WHERE UploadID = @CreationUploadID
ORDER BY BatchNumber;

PRINT '--- Pattern 3 + pattern 10 check ---';
SELECT EmployeeId, FName, LName, EmailID
FROM TEmployee
WHERE EmailID IN ('seedsm.hire01@seedtest.invalid', 'seedsm.hire02@seedtest.invalid');
PRINT 'CONTROL check: exactly one row for seedsm.hire01@seedtest.invalid must exist, else the fixture is broken.';
PRINT 'Expect: Test 6''s duplicate did NOT create a second row for that same email.';
PRINT 'Expect: NO row at all for seedsm.hire02@seedtest.invalid, despite Test 7 reporting it as Processed - pattern 10 on the creation path.';
