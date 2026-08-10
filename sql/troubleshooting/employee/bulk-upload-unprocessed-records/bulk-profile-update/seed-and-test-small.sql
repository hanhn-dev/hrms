-- =============================================================================
-- bulk-profile-update/seed-and-test-small.sql
--
-- Purpose:  Seeds a small, hand-authored Bulk Profile Update upload for
--           EmployerID=10, then drives the REAL processing stored procedure
--           directly (SP_BulkUpdateProfile_Process_Template) so you can
--           confirm, with your own eyes on this DB, whether the processing
--           pipeline behaves correctly - and reproduce the specific defects
--           written up in ..\rca-bulk-upload-unprocessed-records.md
--           (parent folder):
--             Pattern 1  - poisoned @ErrorMessage cursor var (Personal Details)
--             Pattern 10 - NULL-poisoning via Language Read/Write/Speak lookup
--             Pattern 12 - stale/non-existent BankDetailId silently no-ops
--             Pattern 13 - non-numeric "Skill Name" aborts the whole batch
--
--           See ..\bulk-employee-creation\seed-and-test-small.sql for the
--           Bulk Employee Creation equivalent (patterns 3 and 10-on-creation).
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
--           @RunTag     - short tag embedded in DocumentID so
--                         cleanup-bulk-upload-seed-test-data.sql can find
--                         everything this run created.
--
-- !! THIS SCRIPT WRITES DATA !!
--   - Calls the LIVE processing SP directly, which means real writes to
--     TEmployee / TEmployeeBankDetails / TEmployeeSkillDetails for the
--     sampled EmployeeIDs at EmployerID=10 (existing employees get a few
--     harmless text fields overwritten with "SeedSm..." test values).
--   - Run this against a non-prod database. Confirmed default connection at
--     the time this script was written resolves to IN-SVR-DBDEVHRM (dev).
--   - Nothing here is wrapped in an outer explicit transaction: the target
--     SP already manages its own named transaction per record internally,
--     and SQL Server does not allow naming/rolling back a transaction that
--     isn't the outermost one - wrapping our own transaction around these
--     calls would break on the very first per-record ROLLBACK. This matches
--     how the app itself calls this SP (no outer transaction either).
--   - Use cleanup-bulk-upload-seed-test-data.sql afterward. These are
--     pre-existing real employees, so cleanup can only report what changed,
--     not automatically revert it - re-run is safe (values are overwritten
--     the same way every time) but a real revert requires you to note the
--     "before" values yourself if this ever runs somewhere those matter.
--
-- Notes:    - Each EXEC below is a single call to the real per-section
--            processing SP, passing a hand-built JSON batch as @EmployeeData -
--            exactly the shape the app itself builds, just typed by hand here.
--           - Every "bug repro" record is paired with a plain control record
--            in the SAME call, built from real values sampled off this DB
--            (real EmployeeIDs/BankDetailId/SkillID/TLanguage name). Check
--            the control first: if it didn't take effect either, the
--            fixture is wrong, not the processing logic - see the PRINTs in
--            the verification section for exactly which row is which.
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
DECLARE @SectionID_Bank     INT = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section = 'Bank Details');
DECLARE @SectionID_Skill    INT = (SELECT SectionID FROM TEmployeeDetail_Section WHERE Section = 'Skill Details');

DECLARE @UpdateUploadID INT;

INSERT INTO TEmployeeDetail_Upload
    (EmployerID, CountryID, DocumentID, IsQueue, CreatedBy, Status, IsShowData, UploadType)
VALUES
    (@EmployerID, 0, @RunTag + '-BPU', 0, @LoginId, 'Created', 1, 'BulkProfileUpdate');

SET @UpdateUploadID = SCOPE_IDENTITY();
PRINT 'Bulk Profile Update UploadID = ' + CAST(@UpdateUploadID AS VARCHAR(10));

-- --- Personal Details section row -------------------------------------------
DECLARE @UploadSectionID_Personal INT;

INSERT INTO TEmployeeDetail_Upload_Section
    (UploadID, SectionID, Fields, Section_JSON, Total, Valid, InValid, CreatedBy, CreateDate)
VALUES
    (@UpdateUploadID, @SectionID_Personal,
     'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Date of Birth,Language Read',
     '[{"ID":30714,"isValid":"True","First Name":"SeedSmBad","Middle Name":"QA","Last Name":"BadDOB01","Nationality":"American","Zip Code of Birth":"10001","Date of Birth":"NOT-A-DATE"},{"ID":30715,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"AfterBad01","Nationality":"American","Zip Code of Birth":"10002"},{"ID":30713,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"AfterBad02","Nationality":"American","Zip Code of Birth":"10003"},{"ID":30712,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"AfterBad03","Nationality":"American","Zip Code of Birth":"10004"},{"ID":30711,"isValid":"True","First Name":"SeedSmBad","Middle Name":"QA","Last Name":"LangBug01ShouldNotApply","Nationality":"Atlantean","Zip Code of Birth":"99999","Language Read":"Klingon"},{"ID":30710,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"LangControlOk01","Nationality":"American","Zip Code of Birth":"10005","Language Read":"Hindi"}]',
     6, 6, 0, @LoginId, GETDATE());

SET @UploadSectionID_Personal = SCOPE_IDENTITY();

-- Test 1: poisoned-cursor demo (RCA pattern 1). Record 1 is designed to fail
-- (Date of Birth = 'NOT-A-DATE' -> TEmployee.DoB is a real `date` column, so
-- sp_executesql throws). Records 2-4 are fully valid (the control). Expect:
-- all four update TEmployee successfully (verify below), but because
-- @ErrorMessage is declared *inside* the CATCH block and T-SQL does not
-- scope DECLARE to the block, it stays non-NULL for the rest of THIS EXEC's
-- cursor loop - so records 2-4 will ALSO show up in the UnProcessed JSON
-- despite succeeding. If records 2-4 did NOT update TEmployee at all, that's
-- a fixture problem, not pattern 1.
EXEC dbo.SP_BulkUpdateProfile_Process_Template
    @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = 1,
    @UploadSectionID = @UploadSectionID_Personal, @SectionID = @SectionID_Personal,
    @EmployeeData = '[{"ID":30714,"isValid":"True","First Name":"SeedSmBad","Middle Name":"QA","Last Name":"BadDOB01","Nationality":"American","Zip Code of Birth":"10001","Date of Birth":"NOT-A-DATE"},{"ID":30715,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"AfterBad01","Nationality":"American","Zip Code of Birth":"10002"},{"ID":30713,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"AfterBad02","Nationality":"American","Zip Code of Birth":"10003"},{"ID":30712,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"AfterBad03","Nationality":"American","Zip Code of Birth":"10004"}]',
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Date of Birth',
    @Isdone = 1;

-- Test 2: NULL-poisoning via bad Language Read lookup (RCA pattern 10), with
-- a control record (employee 30710, "Hindi" - a real TLanguage row for this
-- employer) in the same batch to prove the bug is per-record, not batch-wide
-- (unlike Test 1). "Klingon" does not exist in TLanguage for EmployerID=10
-- -> Ufn_BulkProfile_languageNamestoIds returns NULL -> the ENTIRE dynamic
-- UPDATE string for that record becomes NULL (CONCAT_NULL_YIELDS_NULL) ->
-- nothing at all is written for employee 30711, not even Last Name/
-- Nationality/Zip - yet it is still reported Processed. If the control
-- (30710) did NOT update either, the fixture is wrong, not pattern 10.
EXEC dbo.SP_BulkUpdateProfile_Process_Template
    @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = 2,
    @UploadSectionID = @UploadSectionID_Personal, @SectionID = @SectionID_Personal,
    @EmployeeData = '[{"ID":30711,"isValid":"True","First Name":"SeedSmBad","Middle Name":"QA","Last Name":"LangBug01ShouldNotApply","Nationality":"Atlantean","Zip Code of Birth":"99999","Language Read":"Klingon"},{"ID":30710,"isValid":"True","First Name":"SeedSmOk","Middle Name":"QA","Last Name":"LangControlOk01","Nationality":"American","Zip Code of Birth":"10005","Language Read":"Hindi"}]',
    @FieldList = 'First Name,Middle Name,Last Name,Nationality,Zip Code of Birth,Language Read',
    @Isdone = 1;

-- --- Bank Details section row -----------------------------------------------
DECLARE @UploadSectionID_Bank INT;

INSERT INTO TEmployeeDetail_Upload_Section
    (UploadID, SectionID, Fields, Section_JSON, Total, Valid, InValid, CreatedBy, CreateDate)
VALUES
    (@UpdateUploadID, @SectionID_Bank,
     'Account Number,Bank Identifier Code,Bank Name,Branch Name,Name as per Bank Account',
     '[{"ID":30715,"isValid":"True","BankDetailId":11343,"Account Number":"999888777","Bank Identifier Code":"TESTBIC01","Bank Name":"SeedTest Bank","Branch Name":"SeedTest Branch","Name as per Bank Account":"SeedTest Auto01"},{"ID":30715,"isValid":"True","BankDetailId":999999,"Account Number":"111222333","Bank Identifier Code":"STALEBIC1","Bank Name":"Stale Bank","Branch Name":"Stale Branch","Name as per Bank Account":"Stale Test"}]',
     2, 2, 0, @LoginId, GETDATE());

SET @UploadSectionID_Bank = SCOPE_IDENTITY();

-- Test 3: real update (BankDetailId=11343, an existing row for employee
-- 30715 - the control) alongside a stale/non-existent BankDetailId=999999
-- (RCA pattern 12). Expect: 11343's AccountNo/BankName etc actually change;
-- the 999999 record is reported the same as the valid one but should NOT
-- create or change any real bank row - verify below. If 11343 did NOT
-- update, the fixture is wrong, not pattern 12.
EXEC dbo.SP_BulkUpdateProfile_Process_Template
    @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = 1,
    @UploadSectionID = @UploadSectionID_Bank, @SectionID = @SectionID_Bank,
    @EmployeeData = '[{"ID":30715,"isValid":"True","BankDetailId":11343,"Account Number":"999888777","Bank Identifier Code":"TESTBIC01","Bank Name":"SeedTest Bank","Branch Name":"SeedTest Branch","Name as per Bank Account":"SeedTest Auto01"},{"ID":30715,"isValid":"True","BankDetailId":999999,"Account Number":"111222333","Bank Identifier Code":"STALEBIC1","Bank Name":"Stale Bank","Branch Name":"Stale Branch","Name as per Bank Account":"Stale Test"}]',
    @FieldList = 'Account Number,Bank Identifier Code,Bank Name,Branch Name,Name as per Bank Account',
    @Isdone = 1;

-- --- Skill Details section row ----------------------------------------------
DECLARE @UploadSectionID_Skill INT;

INSERT INTO TEmployeeDetail_Upload_Section
    (UploadID, SectionID, Fields, Section_JSON, Total, Valid, InValid, CreatedBy, CreateDate)
VALUES
    (@UpdateUploadID, @SectionID_Skill,
     'Skill Name,Experience (Years),Last Used (YYYY)',
     '[{"ID":30715,"isValid":"true","Skill Name":"369","Experience (Years)":"12","Last Used (YYYY)":"2024-01-01"},{"ID":30713,"isValid":"true","Skill Name":"Communication","Experience (Years)":"5","Last Used (YYYY)":"2023-01-01"}]',
     2, 2, 0, @LoginId, GETDATE());

SET @UploadSectionID_Skill = SCOPE_IDENTITY();

-- Test 4: valid numeric SkillID (369 = "other" for EmployerID=10 - the
-- control) followed by a non-numeric "Skill Name" (RCA pattern 13). The
-- cursor's FETCH implicitly converts the JSON value straight into an INT
-- variable, OUTSIDE any TRY/CATCH - "Communication" is not numeric, so the
-- FETCH itself throws and aborts the whole call. Expect: employee 30715's
-- skill row IS committed for real (its own transaction already closed
-- before we reach employee 30713), but SP_BulkUpdateProfile_Process_
-- Template's own outer CATCH still fires, so TProcessedBatchResult.Result
-- ends up '[]' for this batch - a real write hidden behind an apparently-
-- empty result. If 30715's skill row was never created, the fixture is
-- wrong, not pattern 13.
BEGIN TRY
    EXEC dbo.SP_BulkUpdateProfile_Process_Template
        @UploadID = @UpdateUploadID, @LoginId = @LoginId, @Batchno = 1,
        @UploadSectionID = @UploadSectionID_Skill, @SectionID = @SectionID_Skill,
        @EmployeeData = '[{"ID":30715,"isValid":"true","Skill Name":"369","Experience (Years)":"12","Last Used (YYYY)":"2024-01-01"},{"ID":30713,"isValid":"true","Skill Name":"Communication","Experience (Years)":"5","Last Used (YYYY)":"2023-01-01"}]',
        @FieldList = 'Skill Name,Experience (Years),Last Used (YYYY)',
        @Isdone = 1;
END TRY
BEGIN CATCH
    PRINT 'Skill batch threw as expected (RCA pattern 13): ' + ERROR_MESSAGE();
END CATCH

-- =============================================================================
-- VERIFICATION - check the CONTROL row first. If a control didn't change,
-- stop there - the fixture is wrong, not the processing logic. Only once the
-- control is confirmed does the paired "bug" row's outcome mean anything.
-- =============================================================================

PRINT '--- Upload header status ---';
SELECT UploadID, UploadType, Status, DocumentID
FROM TEmployeeDetail_Upload
WHERE UploadID = @UpdateUploadID;

PRINT '--- Section counters (Processed/UnProcessed as the pipeline recorded them) ---';
SELECT UploadSectionID, UploadID, SectionID, Total, Valid, InValid, Processed, UnProcessed
FROM TEmployeeDetail_Upload_Section
WHERE UploadID = @UpdateUploadID
ORDER BY UploadSectionID;

PRINT '--- Raw per-batch results (Result = [] can mean "legitimately empty" OR "silently dropped", see Test 4) ---';
SELECT UploadID, UploadSectionID, BatchNumber, Result, Status
FROM TProcessedBatchResult
WHERE UploadID = @UpdateUploadID
ORDER BY UploadSectionID, BatchNumber;

PRINT '--- Personal Details: what actually changed on TEmployee (pattern 1 + pattern 10 check) ---';
SELECT EmployeeId, FName, MiddleName, LName, Nationality, BirthZipCode, DoB
FROM TEmployee
WHERE EmployeeId IN (30714, 30715, 30713, 30712, 30711, 30710)
ORDER BY EmployeeId;
PRINT 'CONTROL check: 30715/30713/30712 must show Last Name = AfterBad0x, else the fixture is broken.';
PRINT 'Expect: 30715/30713/30712 DID change even though pattern 1 may still list them as UnProcessed above.';
PRINT 'CONTROL check: 30710 must show Last Name = LangControlOk01, else the fixture is broken.';
PRINT 'Expect: 30711 did NOT change at all (still whatever it was before) despite being reported Processed - pattern 10.';

PRINT '--- Bank Details: pattern 12 check ---';
SELECT BankDetailId, EmployeeId, BankName, AccountNo, BranchName
FROM TEmployeeBankDetails
WHERE EmployeeId = 30715
ORDER BY BankDetailId;
PRINT 'CONTROL check: BankDetailId 11343 must show BankName = ''SeedTest Bank'', else the fixture is broken.';
PRINT 'Expect: no new/changed row should exist for the fake BankDetailId 999999.';

PRINT '--- Skill Details: pattern 13 check ---';
SELECT SkillDetailsId, EmployeeId, SkillId, ExperianceInMonths, LastUsedDate
FROM TEmployeeSkillDetails
WHERE EmployeeId IN (30715, 30713);
PRINT 'CONTROL check: a row for 30715/SkillId=369 must exist, else the fixture is broken.';
PRINT 'Expect: no attempt was made for 30713 (its "Communication" value crashed the FETCH before that row was reached).';
