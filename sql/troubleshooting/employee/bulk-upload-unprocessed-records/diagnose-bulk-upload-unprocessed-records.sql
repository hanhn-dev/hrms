-- =============================================================================
-- diagnose-bulk-upload-unprocessed-records.sql
--
-- Purpose:  Deep-dives ONE Bulk Profile Update / Bulk Employee Creation
--           upload (TEmployeeDetail_Upload) to explain why specific
--           employees ended up "Unprocessed" - the reason shown in the UI
--           ("Unprocessed Reasons" grid column) is almost always the generic
--           "The Records Were Unprocessed Due To An Internal Server Error."
--           string, regardless of the real cause. This script checks, per
--           record, for each of the 8 root-cause patterns documented in
--           rca-bulk-upload-unprocessed-records.md (this folder).
--
-- When to use: a support ticket reports employees stuck "Unprocessed" on a
--           Bulk Profile Update or Bulk Employee Creation upload and the
--           on-screen reason doesn't explain why.
--
-- Inputs:   @UploadID          - the TEmployeeDetail_Upload.UploadID from the
--                                 grid/support ticket. Set this if known.
--           @EmploymentNumber  - Bulk PROFILE UPDATE tickets only: resolves
--                                 to EmployeeId, used to filter Sections E/F
--                                 down to this one employee. Leave NULL for a
--                                 whole-upload view.
--           @WorkEmail         - Bulk EMPLOYEE CREATION tickets only: the new
--                                 hire has no EmploymentNumber yet, so filter
--                                 by the Work Email used on the sheet instead.
--           @EmployerID        - optional; only used by the best-effort
--                                 UploadID lookup in Section A, when
--                                 @UploadID is NULL.
--
-- Notes:    - Read-only (SELECT only); uses local #temp tables, dropped at
--             the end - no permanent objects.
--           - If @UploadID is NULL, Section A makes a best-effort attempt to
--             find it by scanning recent TProcessedBatchResult.EmployeeData
--             for the given @EmploymentNumber/@WorkEmail (LIKE scan over JSON
--             text - capped to the last 90 days). Set @UploadID from the
--             result and re-run for the full diagnosis.
--           - "Result = '[]'" on a batch is not automatically a bug - a
--             batch can legitimately contain zero valid records for a given
--             section. Section E is what tells a real silent drop (records
--             submitted as valid, nothing came back at all) from a
--             legitimately empty batch (nothing valid was submitted).
--           - Root-cause reference: rca-bulk-upload-unprocessed-records.md
-- =============================================================================

DECLARE @UploadID INT = NULL;                   -- <<< set this if you have the UploadID
DECLARE @EmploymentNumber NVARCHAR(20) = NULL;  -- <<< Bulk Profile Update: set instead of UploadID
DECLARE @WorkEmail NVARCHAR(200) = NULL;        -- <<< Bulk Employee Creation: set instead of UploadID
DECLARE @EmployerID INT = NULL;                 -- optional, narrows the Section A best-effort lookup

-- ---------------------------------------------------------------------------
-- Section A: best-effort UploadID resolution when only the employee is known
-- ---------------------------------------------------------------------------
IF @UploadID IS NULL AND (@EmploymentNumber IS NOT NULL OR @WorkEmail IS NOT NULL)
BEGIN
    DECLARE @SearchText NVARCHAR(200) = ISNULL(@EmploymentNumber, @WorkEmail);

    SELECT TOP 20
        pbr.UploadID,
        u.UploadType,
        u.Status,
        u.EmployerID,
        pbr.BatchNumber,
        pbr.UploadSectionID,
        pbr.CreadtedDate AS BatchCreatedDate
    FROM TProcessedBatchResult pbr WITH (NOLOCK)
    INNER JOIN TEmployeeDetail_Upload u WITH (NOLOCK) ON u.UploadID = pbr.UploadID
    WHERE pbr.EmployeeData LIKE '%' + @SearchText + '%'
        AND pbr.CreadtedDate >= DATEADD(DAY, -90, GETDATE())
        AND (@EmployerID IS NULL OR u.EmployerID = @EmployerID)
    ORDER BY pbr.CreadtedDate DESC;

    PRINT 'Best-effort match(es) above (last 90 days). Set @UploadID from here and re-run for the full diagnosis.';
END

-- Resolve the employee filter key once (matches "EmployeeId"/"Work Email" as they appear in the JSON)
DECLARE @ResolvedEmployeeId NVARCHAR(50) = NULL;
IF @EmploymentNumber IS NOT NULL
    SELECT @ResolvedEmployeeId = CAST(EmployeeId AS NVARCHAR(50))
    FROM TEmployeeInfo WITH (NOLOCK)
    WHERE EmploymentNumber = @EmploymentNumber;
DECLARE @FilterKey NVARCHAR(200) = COALESCE(@ResolvedEmployeeId, @WorkEmail);

-- ---------------------------------------------------------------------------
-- Section B: upload header status
-- ---------------------------------------------------------------------------
SELECT
    u.UploadID,
    u.EmployerID,
    u.UploadType,
    u.Status,
    u.ValidatedOn,
    u.UpdatedDate,
    DATEDIFF(DAY, u.ValidatedOn, GETDATE()) AS DaysSinceValidated,
    u.ProcessedResult,
    u.ErrorMessage AS DeadErrorMessageColumn,
    CASE
        WHEN u.Status = 'Validated' AND DATEDIFF(HOUR, u.ValidatedOn, GETDATE()) > 1
            THEN 'STUCK: validated but never finished processing (rca pattern 5/6 - a batch call never completed for every section)'
        WHEN u.Status = 'Processed' AND (u.ProcessedResult IS NULL OR u.ProcessedResult = '[]')
            THEN 'SUSPECT: marked Processed but ProcessedResult is empty - could be legitimately zero valid records, OR the outer CATCH swallowed a failure and Status was still set from @Isdone (rca pattern 7). Check Section D/E.'
        WHEN u.Status = 'Created'
            THEN 'Never validated - this is a validation-step issue, not a processing one'
        ELSE 'OK'
    END AS HeaderDiagnosis
FROM TEmployeeDetail_Upload u WITH (NOLOCK)
WHERE u.UploadID = @UploadID;

-- ---------------------------------------------------------------------------
-- Section C: section-level counts + arithmetic consistency
-- ---------------------------------------------------------------------------
SELECT
    s.UploadSectionID,
    s.SectionID,
    sec.Section AS SectionName,
    s.Total,
    s.Valid,
    s.InValid,
    s.Processed,
    s.UnProcessed,
    CASE WHEN ISNULL(s.Total, 0) <> ISNULL(s.Valid, 0) + ISNULL(s.InValid, 0)
        THEN 'DRIFT: Total <> Valid+InValid'
    END AS ValidationCountDrift,
    CASE WHEN ISNULL(s.Valid, 0) <> ISNULL(s.Processed, 0) + ISNULL(s.UnProcessed, 0)
        THEN 'DRIFT: Valid <> Processed+UnProcessed (rows vanished from every bucket, or UnProcessed was overwritten instead of accumulated across batches - rca pattern 4)'
    END AS ProcessCountDrift
FROM TEmployeeDetail_Upload_Section s WITH (NOLOCK)
LEFT JOIN TEmployeeDetail_Section sec WITH (NOLOCK) ON sec.SectionID = s.SectionID
WHERE s.UploadID = @UploadID
ORDER BY s.SectionID;

-- ---------------------------------------------------------------------------
-- Section C2: quick check for rca pattern 10 (NULL-poisoning via the
-- Language Read/Write/Speak lookup silently drops the ENTIRE Personal
-- Details record for this employer - confirmed to always fire for any
-- employer with zero TLanguage rows; no error, no Unprocessed flag, nothing)
-- ---------------------------------------------------------------------------
SELECT
    u.EmployerID,
    (SELECT COUNT(*) FROM tlanguage WHERE Employerid = u.EmployerID) AS LanguageMasterRowCount,
    CASE WHEN (SELECT COUNT(*) FROM tlanguage WHERE Employerid = u.EmployerID) = 0
        THEN 'HIGH RISK: this employer has ZERO TLanguage rows - ANY non-blank Language Read/Write/Speak value on Personal Details will silently drop the entire employee record (rca pattern 10)'
        ELSE 'Has language master data - pattern 10 only fires if the submitted text does not exactly match a seeded Languagename'
    END AS Pattern10Risk
FROM TEmployeeDetail_Upload u WITH (NOLOCK)
WHERE u.UploadID = @UploadID;

-- ---------------------------------------------------------------------------
-- Section D: parse every batch's submitted-as-valid records vs. what came back
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#SubmittedValid') IS NOT NULL DROP TABLE #SubmittedValid;
IF OBJECT_ID('tempdb..#ReturnedOutcome') IS NOT NULL DROP TABLE #ReturnedOutcome;

CREATE TABLE #SubmittedValid (
    UploadSectionID INT,
    BatchNumber INT,
    RecordKey NVARCHAR(200)
);

CREATE TABLE #ReturnedOutcome (
    UploadSectionID INT,
    BatchNumber INT,
    SectionId INT,
    RecordKey NVARCHAR(200),
    Outcome VARCHAR(20),
    ErrorMessage NVARCHAR(MAX)
);

INSERT INTO #SubmittedValid (UploadSectionID, BatchNumber, RecordKey)
SELECT
    pbr.UploadSectionID,
    pbr.BatchNumber,
    COALESCE(ed.EmployeeId, ed.RecordId, ed.WorkEmail)
FROM TProcessedBatchResult pbr WITH (NOLOCK)
CROSS APPLY OPENJSON(pbr.EmployeeData) WITH (
    RecordId NVARCHAR(50) '$.ID',
    EmployeeId NVARCHAR(50) '$.EmployeeId',
    WorkEmail NVARCHAR(200) '$."Work Email"',
    IsValidFlag NVARCHAR(20) '$.isValid'
) ed
WHERE pbr.UploadID = @UploadID
    AND ed.IsValidFlag = 'True';

INSERT INTO #ReturnedOutcome (UploadSectionID, BatchNumber, SectionId, RecordKey, Outcome, ErrorMessage)
SELECT
    pbr.UploadSectionID,
    pbr.BatchNumber,
    sec.SectionId,
    COALESCE(p.EmployeeId, p.WorkEmail),
    'Processed',
    NULL
FROM TProcessedBatchResult pbr WITH (NOLOCK)
CROSS APPLY OPENJSON(pbr.Result) WITH (
    SectionId INT '$.SectionId',
    ProcessedJson NVARCHAR(MAX) '$.Processed' AS JSON
) sec
CROSS APPLY OPENJSON(sec.ProcessedJson) WITH (
    EmployeeId NVARCHAR(50) '$.EmployeeId',
    WorkEmail NVARCHAR(200) '$."Work Email"'
) p
WHERE pbr.UploadID = @UploadID;

INSERT INTO #ReturnedOutcome (UploadSectionID, BatchNumber, SectionId, RecordKey, Outcome, ErrorMessage)
SELECT
    pbr.UploadSectionID,
    pbr.BatchNumber,
    sec.SectionId,
    COALESCE(un.EmployeeId, un.WorkEmail),
    'Unprocessed',
    (SELECT STRING_AGG(m.value, ' | ') FROM OPENJSON(un.ErrorMessageJson) m)  -- ErrorMessage can hold multiple stacked reasons; JSON_VALUE '$[0]' would silently drop the rest
FROM TProcessedBatchResult pbr WITH (NOLOCK)
CROSS APPLY OPENJSON(pbr.Result) WITH (
    SectionId INT '$.SectionId',
    UnProcessedJson NVARCHAR(MAX) '$.UnProcessed' AS JSON
) sec
CROSS APPLY OPENJSON(sec.UnProcessedJson) WITH (
    EmployeeId NVARCHAR(50) '$.EmployeeId',
    WorkEmail NVARCHAR(200) '$."Work Email"',
    ErrorMessageJson NVARCHAR(MAX) '$.ErrorMessage' AS JSON
) un
WHERE pbr.UploadID = @UploadID;

-- ---------------------------------------------------------------------------
-- Section E: silent drops - submitted as valid, absent from BOTH outcome lists.
-- Candidate causes by section: Personal Details -> rca pattern 10 (Language
-- lookup NULL-poisoning - check Section C2 above first); Bank Details -> rca
-- pattern 12 (stale/non-matching BankDetailID); Current Employment Details
-- (Bulk Employee Creation) -> rca pattern 8 (hardcoded Section-14 dependency);
-- any section -> rca pattern 5/6 (duplicate-batch guard, unmapped SectionID).
-- ---------------------------------------------------------------------------
SELECT
    sv.UploadSectionID,
    ts.SectionID,
    sec.Section AS SectionName,
    sv.BatchNumber,
    sv.RecordKey,
    'SILENT DROP: submitted as valid, absent from both Processed and UnProcessed in the batch result' AS Diagnosis
FROM #SubmittedValid sv
LEFT JOIN TEmployeeDetail_Upload_Section ts ON ts.UploadSectionID = sv.UploadSectionID
LEFT JOIN TEmployeeDetail_Section sec ON sec.SectionID = ts.SectionID
WHERE NOT EXISTS (
        SELECT 1 FROM #ReturnedOutcome ro
        WHERE ro.UploadSectionID = sv.UploadSectionID
            AND ro.BatchNumber = sv.BatchNumber
            AND ro.RecordKey = sv.RecordKey
    )
    AND (@FilterKey IS NULL OR sv.RecordKey = @FilterKey)
ORDER BY sv.UploadSectionID, sv.BatchNumber;

-- If Bulk Employee Creation's Personal Details section (SectionID = 1) is silently dropping
-- everything, check whether Current Employment Details (hardcoded SectionID = 14 dependency,
-- rca pattern 8) actually has data for this upload:
SELECT
    UploadSectionID,
    SectionID,
    CASE WHEN Section_JSON IS NULL OR Section_JSON = '' THEN 'MISSING - this would silently zero out Personal Details processing (rca pattern 8)'
         ELSE 'present'
    END AS Section14DataStatus
FROM TEmployeeDetail_Upload_Section WITH (NOLOCK)
WHERE UploadID = @UploadID AND SectionID = 14;

-- ---------------------------------------------------------------------------
-- Section F: poisoned-variable symptom - same record in BOTH outcome lists
-- for the same batch (rca pattern 1 - Bulk Profile Update only)
-- ---------------------------------------------------------------------------
SELECT
    p.UploadSectionID,
    p.BatchNumber,
    p.SectionId,
    p.RecordKey,
    'POISONED-VARIABLE SYMPTOM: appears as BOTH Processed and Unprocessed in the same batch - it actually succeeded but a LATER failure in the same cursor loop mis-flagged it too (rca pattern 1)' AS Diagnosis
FROM #ReturnedOutcome p
INNER JOIN #ReturnedOutcome u
    ON u.UploadSectionID = p.UploadSectionID
    AND u.BatchNumber = p.BatchNumber
    AND u.RecordKey = p.RecordKey
    AND u.Outcome = 'Unprocessed'
WHERE p.Outcome = 'Processed'
    AND (@FilterKey IS NULL OR p.RecordKey = @FilterKey);

-- ---------------------------------------------------------------------------
-- Section G: reason-message breakdown - generic vs. specific
-- ---------------------------------------------------------------------------
SELECT
    ErrorMessage,
    COUNT(*) AS RecordCount,
    CASE
        WHEN ErrorMessage = 'The Records Were Unprocessed Due To An Internal Server Error.'
            THEN 'Generic - real cause only exists in TSQL_Errorlogs (Section H) - rca pattern 2'
        WHEN ErrorMessage = 'The Records Were Unprocessed Due To Work Email Already Exists.'
            THEN 'Generic duplicate message - could be an existing active employee OR a duplicate staged in another in-flight upload; text alone cannot tell which - rca pattern 3'
        ELSE 'Specific business-rule reason'
    END AS ReasonQuality
FROM #ReturnedOutcome
WHERE Outcome = 'Unprocessed'
    AND (@FilterKey IS NULL OR RecordKey = @FilterKey)
GROUP BY ErrorMessage
ORDER BY RecordCount DESC;

-- ---------------------------------------------------------------------------
-- Section H: best-effort real error text from TSQL_Errorlogs
-- (only source of the true SQL exception - not linked by UploadID, matched by
-- time window; narrow further with @FilterKey if the ParamterValue text
-- includes it)
-- ---------------------------------------------------------------------------
DECLARE @WindowStart DATETIME, @WindowEnd DATETIME;
SELECT
    @WindowStart = DATEADD(MINUTE, -5, MIN(CreadtedDate)),
    @WindowEnd = DATEADD(MINUTE, 5, MAX(CreadtedDate))
FROM TProcessedBatchResult WITH (NOLOCK)
WHERE UploadID = @UploadID;

SELECT TOP 50
    e.ErrorDate,
    e.Error_proc,
    e.ErrorMessage,
    e.Errorline,
    e.ParamterValue
FROM TSQL_Errorlogs e WITH (NOLOCK)
WHERE e.ErrorDate BETWEEN @WindowStart AND @WindowEnd
    AND (@FilterKey IS NULL OR e.ParamterValue LIKE '%' + @FilterKey + '%')
ORDER BY e.ErrorDate;

DROP TABLE #SubmittedValid;
DROP TABLE #ReturnedOutcome;
