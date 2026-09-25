-- =============================================================================
-- diagnose-mydetails-history-after-approve.sql
--
-- Purpose:  After approving a My Details change request, Past History still
--           empty / unchanged. Past History does NOT read
--           TMyDetailsChangeRequests. It diffs section history tables:
--             Personal  → TEmployeeHistory
--             Education → TEducationHistoryDetails
--             Family    → TEmployeeFamilyDetails_history
--             Nomination→ TEmployeeNominationHistory
--             Passport  → TEmployeePassportDetailsHistory
--           (then SP_Mydetails_Enhanced_GetEmpHistoryDetails, TypeOfData='History').
--
-- When to use: approve-mydetails-change-request.sql ran, IsApproved = 1, but
--           History → Past History still looks unchanged.
--
-- Inputs:   @ChangeRequestId (required)
--
-- Read-only.
--
-- If this script's last result set (the same SP as the UI) HAS a new row but
-- the screen does not: hard-refresh History. useHistoryChanges is SWR
-- immutable — a SQL approve will not invalidate the open tab's cache.
-- If that result set has NO new row: the approve SP did not write a usable
-- history snapshot (or the History dropdown section does not match).
-- =============================================================================

SET NOCOUNT ON;

DECLARE @ChangeRequestId INT = 10270; -- TODO: e.g. 11260

IF @ChangeRequestId <= 0
BEGIN
    THROW 50000, 'Set @ChangeRequestId before running.', 1;
END;

------------------------------------------------------------------------------
-- 1) Which section is this request? Which History dropdown to use?
------------------------------------------------------------------------------
SELECT
    ChangeRequest.ChangeRequestId,
    ChangeRequest.EmployeeId AS SubjectEmployeeId,
    ChangeRequest.EmployerId,
    ChangeRequest.PageName AS HistoryDropdownHint,
    ChangeRequest.IsApproved,
    CASE
        WHEN ChangeRequest.IsApproved IS NULL THEN 'Still pending — Past History will not get a new snapshot (approve rolled back or never ran)'
        WHEN ChangeRequest.IsApproved = 1 THEN 'Approved — Past History should come from the section history table below, not this row'
        WHEN ChangeRequest.IsApproved = 0 THEN 'Rejected — no apply, so no new Past History'
    END AS ApprovalMeaning,
    ChangeRequest.RequestedDate,
    ChangeRequest.Comments
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
WHERE ChangeRequest.ChangeRequestId = @ChangeRequestId;

SELECT DISTINCT
    Detail.SectionName,
    Detail.TableName,
    Detail.IsNew,
    CASE Detail.TableName
        WHEN 'TEmployee' THEN 'History dropdown: Personal Details (table TEmployeeHistory)'
        WHEN 'TEducationDetails' THEN 'History dropdown: Education Details (table TEducationHistoryDetails)'
        WHEN 'TEmployeeContactDetails' THEN 'History dropdown: Contact Details'
        WHEN 'TEmployeeFamilyDetails' THEN 'History dropdown: Family Details'
        WHEN 'TEmployeeBankDetails' THEN 'History dropdown: Bank Details'
        WHEN 'TCertificationDetails' THEN 'History dropdown: Certification Details'
        WHEN 'TPastEmploymentDetails' THEN 'History dropdown: Past Employment Details'
        WHEN 'TEmployeePassportDetails' THEN 'History dropdown: Passport Details'
        WHEN 'TEmployeeVisaInfo' THEN 'History dropdown: Passport Details (visa rows emit as Passport Details)'
        WHEN 'TEmployeeEmergencyContactDetails' THEN 'History dropdown: Emergency Contact Details'
        WHEN 'TEmployeeNomination' THEN 'History dropdown: Nomination Details'
        ELSE 'Open History dropdown matching SectionName — Education Details will not show this request'
    END AS WhereToLookInUi
FROM dbo.TMyDetailsChangeRequestDetails AS Detail
WHERE Detail.ChangeRequestId = @ChangeRequestId;

------------------------------------------------------------------------------
-- 2) Education history snapshots (only if this CR touched TEducationDetails)
------------------------------------------------------------------------------
DECLARE @SubjectEmployeeId INT = (
    SELECT ChangeRequest.EmployeeId
    FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
    WHERE ChangeRequest.ChangeRequestId = @ChangeRequestId
);

IF EXISTS (
    SELECT 1
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEducationDetails'
)
BEGIN
    SELECT TOP (20)
        History.EducationhistoryId,
        History.EducationId,
        History.EmployeeId,
        History.IsDelete,
        History.LastUpdatedBy,
        History.LastUpdatedOn,
        History.UpdatedDateUtc,
        History.CreatedDateUtc,
        Editor.FName + N' ' + Editor.LName AS EditorName
    FROM dbo.TEducationHistoryDetails AS History
    LEFT JOIN dbo.TEmployee AS Editor
        ON Editor.EmployeeId = History.LastUpdatedBy
    WHERE History.EmployeeId = @SubjectEmployeeId
    ORDER BY
        History.UpdatedDateUtc DESC,
        History.EducationhistoryId DESC;

    SELECT
        Detail.DBFieldName,
        Detail.ChildRowId AS EducationIdOnRequest,
        Detail.TextValueOld,
        Detail.TextValueNew,
        CASE
            WHEN Detail.ChildRowId IS NULL
                THEN 'Approve history INSERT uses TOP 1 ChildRowId — NULL means no TEducationHistoryDetails row was written'
            ELSE 'ChildRowId should match EducationId on a new history row below'
        END AS HistoryWriteNote
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEducationDetails';

    SELECT
        N'Past History for Education diffs TEducationHistoryDetails and drops OldValue = NewValue. A 10-Sep Removed card is an older IsDelete=1 snapshot, not this approve.' AS EducationNote;
END;

------------------------------------------------------------------------------
-- 2b) Family / Nomination / Passport snapshots (new-row approve writes these)
------------------------------------------------------------------------------
IF EXISTS (
    SELECT 1
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEmployeeFamilyDetails'
)
BEGIN
    SELECT TOP (20)
        History.EmployeeFamilyDetailhistoryID,
        History.EmployeeFamilyDetailID,
        History.Name,
        History.Relation,
        History.UpdatedBy,
        History.UpdatedDateUtc,
        History.LastmodifiedOn,
        Editor.FName + N' ' + Editor.LName AS EditorName
    FROM dbo.TEmployeeFamilyDetails_history AS History
    LEFT JOIN dbo.TEmployee AS Editor
        ON Editor.EmployeeId = History.UpdatedBy
    WHERE History.EmployeeId = @SubjectEmployeeId
    ORDER BY
        History.LastmodifiedOn DESC,
        History.EmployeeFamilyDetailhistoryID DESC;

    SELECT
        N'Family approve (new-row and edit) must insert TEmployeeFamilyDetails_history AFTER the live apply. A before-apply snapshot keeps the old Relation / UpdatedDateUtc, so history-only Past History still shows Added Mother after live is Brother.' AS FamilyNote;
END;

IF EXISTS (
    SELECT 1
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEmployeeNomination'
)
BEGIN
    SELECT TOP (20)
        History.EmployeeNominationHistoryId,
        History.EmployeeNominationId,
        History.Name,
        History.UpdatedBy,
        History.UpdatedDateUtc,
        History.LastModifiedOn,
        Editor.FName + N' ' + Editor.LName AS EditorName
    FROM dbo.TEmployeeNominationHistory AS History
    LEFT JOIN dbo.TEmployee AS Editor
        ON Editor.EmployeeId = History.UpdatedBy
    WHERE History.EmployeeId = @SubjectEmployeeId
    ORDER BY
        History.LastModifiedOn DESC,
        History.EmployeeNominationHistoryId DESC;

    SELECT
        N'Nomination new-row approve must insert TEmployeeNominationHistory after the live row.' AS NominationNote;
END;

IF EXISTS (
    SELECT 1
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEmployeePassportDetails'
)
BEGIN
    SELECT TOP (20)
        History.HistoryTransId,
        History.EmployeeId,
        History.PassportNo,
        History.LastUpdatedBy,
        History.LastUpdatedOnUtcTime,
        Editor.FName + N' ' + Editor.LName AS EditorName
    FROM dbo.TEmployeePassportDetailsHistory AS History
    LEFT JOIN dbo.TEmployee AS Editor
        ON Editor.EmployeeId = History.LastUpdatedBy
    WHERE History.EmployeeId = @SubjectEmployeeId
    ORDER BY
        History.HistoryTransId DESC;

    SELECT
        N'Passport approve must insert TEmployeePassportDetailsHistory after the live delete/insert + merge.' AS PassportNote;
END;

------------------------------------------------------------------------------
-- 3) Personal history snapshots (only if this CR touched TEmployee)
------------------------------------------------------------------------------
IF EXISTS (
    SELECT 1
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEmployee'
)
BEGIN
    SELECT TOP (20)
        History.HistoryTransId,
        History.EmployeeId,
        History.UpdatedBy,
        History.UpdatedDate,
        History.UpdatedDateUtcTime,
        History.FName,
        History.LName,
        Editor.FName + N' ' + Editor.LName AS EditorName
    FROM dbo.TEmployeeHistory AS History
    LEFT JOIN dbo.TEmployee AS Editor
        ON Editor.EmployeeId = History.UpdatedBy
    WHERE History.EmployeeId = @SubjectEmployeeId
    ORDER BY
        History.HistoryTransId DESC;

    SELECT
        N'Sp_ApproveRejectMyDetailsReview writes TEmployeeHistory from current TEmployee BEFORE the field UPDATE. Past History then diffs history+live TEmployee. Use History dropdown Personal Details — Education Details will never show this request.' AS PersonalNote;
END;

------------------------------------------------------------------------------
-- 4) Exactly what Past History loads (same SP + params as the UI)
--    History.tsx → useHistoryChanges → SP_Mydetails_Enhanced_GetEmpHistoryDetails
--    @TypeOfData = 'History', @section = dropdown NAME (e.g. 'Education Details')
------------------------------------------------------------------------------
DECLARE @HistorySection VARCHAR(MAX) = (
    SELECT TOP (1)
        CASE Detail.TableName
            WHEN 'TEmployee' THEN 'Personal Details'
            WHEN 'TEducationDetails' THEN 'Education Details'
            WHEN 'TEmployeeContactDetails' THEN 'Contact Details'
            WHEN 'TEmployeeFamilyDetails' THEN 'Family Details'
            WHEN 'TEmployeeBankDetails' THEN 'Bank Details'
            WHEN 'TCertificationDetails' THEN 'Certification Details'
            WHEN 'TPastEmploymentDetails' THEN 'Past Employment Details'
            WHEN 'TEmployeePassportDetails' THEN 'Passport Details'
            WHEN 'TEmployeeVisaInfo' THEN 'Passport Details'
            WHEN 'TEmployeeEmergencyContactDetails' THEN 'Emergency Contact Details'
            WHEN 'TEmployeeNomination' THEN 'Nomination Details'
            ELSE ISNULL(Detail.SectionName, 'Education Details')
        END
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
    ORDER BY
        CASE Detail.TableName
            WHEN 'TEducationDetails' THEN 1
            WHEN 'TEmployee' THEN 2
            ELSE 3
        END
);

SELECT
    @SubjectEmployeeId AS HistoryEmployeeId,
    @HistorySection AS HistoryDropdownMustBe,
    N'If the screen title is a different section, this approve will not appear there.' AS UiHint;

-- Live SP matches the Node API (8 params). Do not pass @Debug — deployed
-- SP_Mydetails_Enhanced_GetEmpHistoryDetails does not declare it.
EXEC dbo.SP_Mydetails_Enhanced_GetEmpHistoryDetails
    @EmployeeId = @SubjectEmployeeId,
    @section = @HistorySection,
    @PageNumber = 1,
    @PageSize = 30,
    @FromDate = NULL,
    @Todate = NULL,
    @TypeOfData = 'History',
    @FieldsCsv = NULL;
