-- =============================================================================
-- find-stuck-and-inconsistent-bulk-uploads.sql
--
-- Purpose:  Fleet-wide scan across ALL Bulk Profile Update / Bulk Employee
--           Creation uploads (TEmployeeDetail_Upload) for the root-cause
--           patterns documented in rca-bulk-upload-unprocessed-records.md
--           (this folder). Use this to find which uploads/tenants are
--           affected before drilling into one with
--           diagnose-bulk-upload-unprocessed-records.sql.
--
-- When to use: a general health check, or "which uploads are affected by
--           this class of bug" rather than a single reported ticket.
--
-- Inputs:   @EmployerID  - optional, narrows to one tenant. NULL = all.
--           @DaysBack    - only look at activity in the last N days. Set to
--                           NULL for a full historical sweep - the
--                           stuck-at-Validated check in particular has hits
--                           going back over a year.
--           @StuckHours  - hours at Status='Validated' with no further
--                           activity that counts as "stuck". Default 4.
--
-- Notes:    Read-only. Confirmed scope on this database as of 2026-08-09
--           (see rca doc): 214/931 uploads stuck at Validated (up to 632
--           days stale), and 30% of TEmployeeDetail_Upload_Section rows have
--           Valid <> Processed+UnProcessed. Result set 4 (poisoned-variable
--           symptom) is Bulk Profile Update only - see rca pattern 1.
-- =============================================================================

DECLARE @EmployerID INT = NULL;
DECLARE @DaysBack INT = 90;
DECLARE @StuckHours INT = 4;

-- ---------------------------------------------------------------------------
-- 1. Uploads stuck at Validated (validation ran, processing never finished)
-- ---------------------------------------------------------------------------
SELECT
    u.UploadID,
    u.EmployerID,
    u.UploadType,
    u.ValidatedOn,
    DATEDIFF(HOUR, u.ValidatedOn, GETDATE()) AS HoursSinceValidated,
    u.CreatedBy
FROM TEmployeeDetail_Upload u WITH (NOLOCK)
WHERE u.Status = 'Validated'
    AND DATEDIFF(HOUR, u.ValidatedOn, GETDATE()) > @StuckHours
    AND (@EmployerID IS NULL OR u.EmployerID = @EmployerID)
    AND (@DaysBack IS NULL OR u.ValidatedOn >= DATEADD(DAY, -@DaysBack, GETDATE()))
ORDER BY u.ValidatedOn;

-- ---------------------------------------------------------------------------
-- 2. Uploads marked Processed with an empty/NULL ProcessedResult
--    (not automatically a bug - could be legitimately zero valid records;
--    drill into one with diagnose-bulk-upload-unprocessed-records.sql)
-- ---------------------------------------------------------------------------
SELECT
    u.UploadID,
    u.EmployerID,
    u.UploadType,
    u.UpdatedDate,
    u.ProcessedResult
FROM TEmployeeDetail_Upload u WITH (NOLOCK)
WHERE u.Status = 'Processed'
    AND (u.ProcessedResult IS NULL OR u.ProcessedResult = '[]')
    AND (@EmployerID IS NULL OR u.EmployerID = @EmployerID)
    AND (@DaysBack IS NULL OR u.UpdatedDate >= DATEADD(DAY, -@DaysBack, GETDATE()))
ORDER BY u.UpdatedDate DESC;

-- ---------------------------------------------------------------------------
-- 3. Section-level arithmetic drift (Total<>Valid+InValid, or
--    Valid<>Processed+UnProcessed)
-- ---------------------------------------------------------------------------
SELECT
    s.UploadID,
    u.EmployerID,
    u.UploadType,
    s.UploadSectionID,
    sec.Section AS SectionName,
    s.Total,
    s.Valid,
    s.InValid,
    s.Processed,
    s.UnProcessed,
    CASE WHEN ISNULL(s.Total, 0) <> ISNULL(s.Valid, 0) + ISNULL(s.InValid, 0) THEN 'Y' ELSE 'N' END AS ValidationDrift,
    CASE WHEN ISNULL(s.Valid, 0) <> ISNULL(s.Processed, 0) + ISNULL(s.UnProcessed, 0) THEN 'Y' ELSE 'N' END AS ProcessDrift
FROM TEmployeeDetail_Upload_Section s WITH (NOLOCK)
INNER JOIN TEmployeeDetail_Upload u WITH (NOLOCK) ON u.UploadID = s.UploadID
LEFT JOIN TEmployeeDetail_Section sec WITH (NOLOCK) ON sec.SectionID = s.SectionID
WHERE (
        ISNULL(s.Total, 0) <> ISNULL(s.Valid, 0) + ISNULL(s.InValid, 0)
        OR ISNULL(s.Valid, 0) <> ISNULL(s.Processed, 0) + ISNULL(s.UnProcessed, 0)
    )
    AND (@EmployerID IS NULL OR u.EmployerID = @EmployerID)
    AND (@DaysBack IS NULL OR s.UpdatedDate >= DATEADD(DAY, -@DaysBack, GETDATE()))
ORDER BY s.UploadID, s.UploadSectionID;

-- ---------------------------------------------------------------------------
-- 4. Poisoned-variable symptom fleet-wide: a record appears as BOTH Processed
--    and Unprocessed in the same batch (rca pattern 1 - Bulk Profile Update
--    section procs only)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#Outcome') IS NOT NULL DROP TABLE #Outcome;
CREATE TABLE #Outcome (
    UploadID INT,
    UploadSectionID INT,
    BatchNumber INT,
    RecordKey NVARCHAR(200),
    Outcome VARCHAR(20)
);

INSERT INTO #Outcome (UploadID, UploadSectionID, BatchNumber, RecordKey, Outcome)
SELECT
    pbr.UploadID,
    pbr.UploadSectionID,
    pbr.BatchNumber,
    COALESCE(p.EmployeeId, p.WorkEmail),
    'Processed'
FROM TProcessedBatchResult pbr WITH (NOLOCK)
INNER JOIN TEmployeeDetail_Upload u WITH (NOLOCK) ON u.UploadID = pbr.UploadID
CROSS APPLY OPENJSON(pbr.Result) WITH (ProcessedJson NVARCHAR(MAX) '$.Processed' AS JSON) sec
CROSS APPLY OPENJSON(sec.ProcessedJson) WITH (
    EmployeeId NVARCHAR(50) '$.EmployeeId',
    WorkEmail NVARCHAR(200) '$."Work Email"'
) p
WHERE (@EmployerID IS NULL OR u.EmployerID = @EmployerID)
    AND (@DaysBack IS NULL OR pbr.CreadtedDate >= DATEADD(DAY, -@DaysBack, GETDATE()));

INSERT INTO #Outcome (UploadID, UploadSectionID, BatchNumber, RecordKey, Outcome)
SELECT
    pbr.UploadID,
    pbr.UploadSectionID,
    pbr.BatchNumber,
    COALESCE(un.EmployeeId, un.WorkEmail),
    'Unprocessed'
FROM TProcessedBatchResult pbr WITH (NOLOCK)
INNER JOIN TEmployeeDetail_Upload u WITH (NOLOCK) ON u.UploadID = pbr.UploadID
CROSS APPLY OPENJSON(pbr.Result) WITH (UnProcessedJson NVARCHAR(MAX) '$.UnProcessed' AS JSON) sec
CROSS APPLY OPENJSON(sec.UnProcessedJson) WITH (
    EmployeeId NVARCHAR(50) '$.EmployeeId',
    WorkEmail NVARCHAR(200) '$."Work Email"'
) un
WHERE (@EmployerID IS NULL OR u.EmployerID = @EmployerID)
    AND (@DaysBack IS NULL OR pbr.CreadtedDate >= DATEADD(DAY, -@DaysBack, GETDATE()));

SELECT
    p.UploadID,
    p.UploadSectionID,
    p.BatchNumber,
    p.RecordKey,
    'Falsely flagged Unprocessed after actually succeeding (rca pattern 1)' AS Diagnosis
FROM #Outcome p
INNER JOIN #Outcome un
    ON un.UploadID = p.UploadID
    AND un.UploadSectionID = p.UploadSectionID
    AND un.BatchNumber = p.BatchNumber
    AND un.RecordKey = p.RecordKey
    AND un.Outcome = 'Unprocessed'
WHERE p.Outcome = 'Processed'
ORDER BY p.UploadID, p.BatchNumber;

DROP TABLE #Outcome;
