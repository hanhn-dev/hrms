-- =============================================================================
-- list-unprocessed-employees-by-upload.sql
--
-- Purpose:  Lists every genuinely Unprocessed employee/record for ONE upload
--           (TEmployeeDetail_Upload), with the section it belongs to, its
--           Unprocessed reason(s), and the raw JSON the employee was actually
--           submitted with (TProcessedBatchResult.EmployeeData) - eyeball that
--           JSON for the field value likely responsible (e.g. a Language
--           Read/Write/Speak value, an oversized field, a stale BankDetailID -
--           see rca patterns 10/11/12). A quick listing only - it does NOT
--           classify WHY a record ended up here; use
--           diagnose-bulk-upload-unprocessed-records.sql (this folder) for
--           that against the 13 known root-cause patterns (see
--           rca-bulk-upload-unprocessed-records.md).
--
-- When to use: you have an UploadID from a ticket/grid and just need "who's
--           unprocessed and what reason does the system show", nothing more.
--
-- Inputs:   @UploadID - the TEmployeeDetail_Upload.UploadID to list.
--
-- Notes:    Read-only (SELECT only).
--
--           A record can appear in TProcessedBatchResult.Result's UnProcessed
--           array from an earlier failed batch attempt and STILL have
--           actually succeeded on a later retry (duplicate/retried batch
--           calls - rca pattern 5/6). The app's own display logic
--           (HRMS.Core.WebAPI.Node Features/Employee/BulkProfileUpdate/Utils
--           /Helper.js mapResult / mapResultOfBulkCreation) checks every
--           batch's Processed list FIRST and only falls back to UnProcessed
--           if no Processed match exists anywhere for that employee+section.
--           This script replicates that precedence: a record only counts as
--           Unprocessed here if it never shows up in ANY batch's Processed
--           list for the same UploadSectionID. Without this, a plain scan of
--           the UnProcessed array (as an earlier version of this script did)
--           over-reports - it will show employees who actually succeeded on
--           retry.
--
--           KNOWN LIMITATION: for repeatable multi-row sections (Bank
--           Details, Skills, Domain, Visa, Past Employment, Nomination,
--           Education, Family, Emergency Contact, Certification), the real
--           app matches a Processed entry using a compound key (EmployeeId +
--           the specific sub-record ID, e.g. EmployeeId-BankDetailId) but
--           this script matches on EmployeeId/WorkEmail only (matching how
--           the app's own UnProcessed key works for those sections). Net
--           effect: if a DIFFERENT sub-record for the same employee in that
--           section succeeded, this script can under-report - it may treat
--           the whole employee as processed even though one specific
--           sub-record for them genuinely failed. For those section types,
--           cross-check with diagnose-bulk-upload-unprocessed-records.sql or
--           the UI directly.
--
--           SubmittedEmployeeData is matched by UploadSectionID (not a
--           specific batch/row) since retries can split payload vs. outcome
--           across different TProcessedBatchResult rows. A "Password" key is
--           stripped from the JSON before it's returned - never relevant to
--           an Unprocessed reason.
-- =============================================================================

DECLARE @UploadID INT = 1077;   -- <<< set this

;WITH Outcomes AS (
    SELECT
        pbr.UploadID,
        pbr.UploadSectionID,
        oc.OutcomeType,
        COALESCE(item.EmployeeId, item.WorkEmail) AS RecordKey,
        item.EmployeeId,
        item.WorkEmail,
        item.ErrorMessageJson
    FROM TProcessedBatchResult pbr WITH (NOLOCK)
    CROSS APPLY OPENJSON(pbr.Result) WITH (
        ProcessedJson NVARCHAR(MAX) '$.Processed' AS JSON,
        UnProcessedJson NVARCHAR(MAX) '$.UnProcessed' AS JSON
    ) s
    CROSS APPLY (VALUES ('Processed', s.ProcessedJson), ('Unprocessed', s.UnProcessedJson)) oc(OutcomeType, OutcomeJson)
    CROSS APPLY OPENJSON(oc.OutcomeJson) WITH (
        EmployeeId NVARCHAR(50) '$.EmployeeId',
        WorkEmail NVARCHAR(200) '$."Work Email"',
        ErrorMessageJson NVARCHAR(MAX) '$.ErrorMessage' AS JSON
    ) item
    WHERE pbr.UploadID = @UploadID
),
ProcessedKeys AS (
    SELECT DISTINCT UploadSectionID, RecordKey
    FROM Outcomes
    WHERE OutcomeType = 'Processed' AND RecordKey IS NOT NULL
),
UnprocessedOnly AS (
    -- DISTINCT collapses the duplicate entries a retried/duplicate batch
    -- call (rca pattern 5/6) leaves behind for the same record
    SELECT DISTINCT
        o.UploadSectionID, o.RecordKey, o.EmployeeId, o.WorkEmail,
        (SELECT STRING_AGG(m.value, ' | ') FROM OPENJSON(o.ErrorMessageJson) m) AS Reason
    FROM Outcomes o
    WHERE o.OutcomeType = 'Unprocessed'
        AND NOT EXISTS (
            -- Processed anywhere for this employee+section wins, even if an
            -- earlier failed attempt also put them in UnProcessed
            SELECT 1 FROM ProcessedKeys pk
            WHERE pk.UploadSectionID = o.UploadSectionID AND pk.RecordKey = o.RecordKey
        )
),
TrueUnprocessed AS (
    SELECT
        uo.UploadSectionID, uo.RecordKey, uo.EmployeeId, uo.WorkEmail,
        STRING_AGG(uo.Reason, ' | ') AS UnprocessedReason
    FROM UnprocessedOnly uo
    GROUP BY uo.UploadSectionID, uo.RecordKey, uo.EmployeeId, uo.WorkEmail
)
SELECT
    tu.UploadSectionID,
    u.EmployerID,
    u.UploadType,
    sec.Section AS SectionName,
    tu.EmployeeId,
    tu.WorkEmail,
    ei.EmploymentNumber,
    tu.UnprocessedReason,
    CASE
        WHEN tu.UnprocessedReason = 'The Records Were Unprocessed Due To An Internal Server Error.'
            THEN 'Generic - real cause only exists in TSQL_Errorlogs (see diagnose script Section H)'
        WHEN tu.UnprocessedReason = 'The Records Were Unprocessed Due To Work Email Already Exists.'
            THEN 'Generic duplicate message - could be an existing active employee OR a duplicate staged in another in-flight upload'
        WHEN tu.UnprocessedReason IS NULL THEN 'No reason recorded at all in the Result JSON for this record'
        ELSE 'Specific business-rule reason'
    END AS ReasonQuality,
    sd.SubmittedJson AS SubmittedEmployeeData
FROM TrueUnprocessed tu
INNER JOIN TEmployeeDetail_Upload u WITH (NOLOCK) ON u.UploadID = @UploadID
LEFT JOIN TEmployeeDetail_Upload_Section uds WITH (NOLOCK) ON uds.UploadSectionID = tu.UploadSectionID
LEFT JOIN TEmployeeDetail_Section sec WITH (NOLOCK) ON sec.SectionID = uds.SectionID
LEFT JOIN TEmployeeInfo ei WITH (NOLOCK) ON ei.EmployeeId = TRY_CAST(tu.EmployeeId AS INT)
OUTER APPLY (
    SELECT TOP 1 JSON_MODIFY(ed.[value], '$.Password', NULL) AS SubmittedJson
    FROM TProcessedBatchResult pbr3 WITH (NOLOCK)
    CROSS APPLY OPENJSON(pbr3.EmployeeData) ed
    WHERE pbr3.UploadID = @UploadID
        AND pbr3.UploadSectionID = tu.UploadSectionID
        AND (
            (tu.EmployeeId IS NOT NULL AND (JSON_VALUE(ed.[value], '$.EmployeeId') = tu.EmployeeId OR JSON_VALUE(ed.[value], '$.ID') = tu.EmployeeId))
            OR (tu.WorkEmail IS NOT NULL AND JSON_VALUE(ed.[value], '$."Work Email"') = tu.WorkEmail)
        )
) sd
ORDER BY sec.Section, tu.EmployeeId, tu.WorkEmail;
