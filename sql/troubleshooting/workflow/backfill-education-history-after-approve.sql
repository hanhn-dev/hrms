-- =============================================================================
-- backfill-education-history-after-approve.sql
--
-- Purpose:  After a My Details Education change request is approved, Past
--           History is empty because Sp_ApproveRejectMyDetailsReview on DEV
--           applies TEducationDetails but does NOT insert
--           TEducationHistoryDetails (live SP has no EducationHistory text).
--           Past History only diffs TEducationHistoryDetails.
--
-- When to use: TMyDetailsChangeRequests.IsApproved = 1, TableName =
--           TEducationDetails, live education row exists, but no matching
--           TEducationHistoryDetails row (EducationId 4945 for CR 10270).
--
-- WRITE script. Inserts one history snapshot per live education row that
-- belongs to this employee and has no history yet, created at/after the
-- request. Does not re-call the approve SP.
--
-- After COMMIT: hard-refresh History → Education Details → Past History.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @ChangeRequestId INT = 10270; -- TODO: set

DECLARE @EmployeeId INT;
DECLARE @RequestedDate DATETIME;
DECLARE @IsApproved BIT;
DECLARE @CreatedBy INT;

SELECT
    @EmployeeId = ChangeRequest.EmployeeId,
    @RequestedDate = ChangeRequest.RequestedDate,
    @IsApproved = ChangeRequest.IsApproved,
    @CreatedBy = ChangeRequest.CreatedBy
FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
WHERE ChangeRequest.ChangeRequestId = @ChangeRequestId;

IF @EmployeeId IS NULL
BEGIN
    THROW 50000, 'ChangeRequestId not found.', 1;
END;

IF @IsApproved <> 1
BEGIN
    THROW 50000, 'Change request is not approved. Do not backfill history.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = @ChangeRequestId
        AND Detail.TableName = 'TEducationDetails'
)
BEGIN
    THROW 50000, 'This change request is not an Education Details request.', 1;
END;

------------------------------------------------------------------------------
-- 1) Live education rows with no history (these will never appear in Past History)
------------------------------------------------------------------------------
SELECT
    Education.EducationId,
    Education.EmployeeId,
    Education.InstituteAddress,
    Education.Grade,
    Education.LastUpdatedBy,
    Education.LastUpdatedOn,
    Education.UpdatedDateUtc,
    Education.CreatedDateUtc,
    Education.IsDelete
FROM dbo.TEducationDetails AS Education
WHERE Education.EmployeeId = @EmployeeId
    AND Education.LastUpdatedOn >= DATEADD(MINUTE, -5, @RequestedDate)
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.TEducationHistoryDetails AS History
        WHERE History.EducationId = Education.EducationId
            AND History.EmployeeId = Education.EmployeeId
    );

------------------------------------------------------------------------------
-- 2) Backfill history snapshot (WRITE)
------------------------------------------------------------------------------
BEGIN TRANSACTION;

INSERT INTO dbo.TEducationHistoryDetails
(
    EducationId,
    EmployeeId,
    EstablishmentTypeId,
    EstablishmentId,
    AffiliateToId,
    AttendedFrom,
    AttendedTo,
    YearOfPassing,
    CompanySponsored,
    Amount,
    ReimbursementDate,
    Discipline,
    LevelId,
    SubjectId,
    MajorFieldId,
    MinorFieldId,
    Grade,
    BreakExplanation,
    LastUpdatedBy,
    LastUpdatedOn,
    InstituteAddress,
    CurrencyId,
    CPApproval,
    TotalUnits,
    UnitsCompleted,
    DivisionOfficer,
    BondPeriod,
    BondAmount,
    SLLeave,
    AcquiredQualification,
    DateOfGraduation,
    VerificationRemarks,
    LastModifiedOn,
    CreatedDateUtc,
    UpdatedDateUtc,
    IsDelete
)
SELECT
    Education.EducationId,
    Education.EmployeeId,
    Education.EstablishmentTypeId,
    Education.EstablishmentId,
    Education.AffiliateToId,
    Education.AttendedFrom,
    Education.AttendedTo,
    Education.YearOfPassing,
    Education.CompanySponsored,
    Education.Amount,
    Education.ReimbursementDate,
    Education.Discipline,
    Education.LevelId,
    Education.SubjectId,
    Education.MajorFieldId,
    Education.MinorFieldId,
    Education.Grade,
    Education.BreakExplanation,
    ISNULL(Education.LastUpdatedBy, @CreatedBy),
    ISNULL(Education.LastUpdatedOn, GETDATE()),
    Education.InstituteAddress,
    Education.CurrencyId,
    Education.CPApproval,
    Education.TotalUnits,
    Education.UnitsCompleted,
    Education.DivisionOfficer,
    Education.BondPeriod,
    Education.BondAmount,
    Education.SLLeave,
    Education.AcquiredQualification,
    Education.DateOfGraduation,
    Education.VerificationRemarks,
    GETDATE(),
    ISNULL(Education.CreatedDateUtc, GETUTCDATE()),
    GETUTCDATE(),
    ISNULL(Education.IsDelete, 0)
FROM dbo.TEducationDetails AS Education
WHERE Education.EmployeeId = @EmployeeId
    AND Education.LastUpdatedOn >= DATEADD(MINUTE, -5, @RequestedDate)
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.TEducationHistoryDetails AS History
        WHERE History.EducationId = Education.EducationId
            AND History.EmployeeId = Education.EmployeeId
    );

SELECT @@ROWCOUNT AS HistoryRowsInserted;

-- Review the INSERT, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

------------------------------------------------------------------------------
-- 3) Confirm (run after COMMIT)
------------------------------------------------------------------------------
SELECT TOP (10)
    History.EducationhistoryId,
    History.EducationId,
    History.InstituteAddress,
    History.Grade,
    History.LastUpdatedBy,
    History.UpdatedDateUtc,
    History.IsDelete
FROM dbo.TEducationHistoryDetails AS History
WHERE History.EmployeeId = @EmployeeId
ORDER BY History.EducationhistoryId DESC;
