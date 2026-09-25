-- =============================================================================
-- backfill-family-history-after-approve.sql
--
-- Purpose:  Family edit was approved (live row is already Brother) but Past
--           History still shows only the original Added / Mother card.
--           Sp_ApproveRejectMyDetailsReview used to snapshot
--           TEmployeeFamilyDetails_history BEFORE the live UPDATE, so history
--           kept the old Relation and the old UpdatedDateUtc. The Family GET
--           diffs history rows only and drops OldValue = NewValue.
--
-- When to use: TMyDetailsChangeRequests.IsApproved = 1, TableName =
--           TEmployeeFamilyDetails, live row exists, latest history row still
--           has the pre-update values (CR 10289: live Brother, history Mother).
--
-- WRITE script. Inserts one after-apply snapshot of the live family row when
-- no history row yet has UpdatedDateUtc >= the live row's UpdatedDateUtc.
-- Does not re-call the approve SP.
--
-- After COMMIT: hard-refresh History → Family Details → Past History.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @ChangeRequestId INT = 10289; -- TODO: set

DECLARE @EmployeeId INT;
DECLARE @IsApproved BIT;
DECLARE @FamilyDetailId INT;

SELECT
    @EmployeeId = ChangeRequest.EmployeeId,
    @IsApproved = ChangeRequest.IsApproved
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

SELECT TOP (1)
    @FamilyDetailId = Detail.ChildRowId
FROM dbo.TMyDetailsChangeRequestDetails AS Detail
WHERE Detail.ChangeRequestId = @ChangeRequestId
    AND Detail.TableName = 'TEmployeeFamilyDetails'
    AND Detail.ChildRowId IS NOT NULL;

IF @FamilyDetailId IS NULL
BEGIN
    THROW 50000, 'This change request is not a Family Details request, or ChildRowId is NULL.', 1;
END;

------------------------------------------------------------------------------
-- 1) Live vs latest history (Mother here + Brother live = needs backfill)
------------------------------------------------------------------------------
SELECT
    Live.EmployeeFamilyDetailID,
    Live.Name AS LiveName,
    Live.Relation AS LiveRelation,
    Live.UpdatedDateUtc AS LiveUpdatedDateUtc,
    History.EmployeeFamilyDetailhistoryID AS LatestHistoryId,
    History.Name AS HistoryName,
    History.Relation AS HistoryRelation,
    History.UpdatedDateUtc AS HistoryUpdatedDateUtc,
    CASE
        WHEN History.EmployeeFamilyDetailhistoryID IS NULL
            THEN 'No history row — Past History will not show Added or Modified'
        WHEN History.UpdatedDateUtc >= Live.UpdatedDateUtc
            THEN 'History already has an after-apply snapshot — do not backfill'
        ELSE 'History is a before-apply snapshot — backfill the live row'
    END AS BackfillAdvice
FROM dbo.TEmployeeFamilyDetails AS Live
OUTER APPLY (
    SELECT TOP (1)
        Snapshot.EmployeeFamilyDetailhistoryID,
        Snapshot.Name,
        Snapshot.Relation,
        Snapshot.UpdatedDateUtc
    FROM dbo.TEmployeeFamilyDetails_history AS Snapshot
    WHERE Snapshot.EmployeeFamilyDetailID = Live.EmployeeFamilyDetailID
        AND Snapshot.EmployeeId = Live.EmployeeId
    ORDER BY
        Snapshot.UpdatedDateUtc DESC,
        Snapshot.EmployeeFamilyDetailhistoryID DESC
) AS History
WHERE Live.EmployeeId = @EmployeeId
    AND Live.EmployeeFamilyDetailID = @FamilyDetailId;

------------------------------------------------------------------------------
-- 2) Backfill history snapshot (WRITE)
------------------------------------------------------------------------------
BEGIN TRANSACTION;

INSERT INTO dbo.TEmployeeFamilyDetails_history
(
    EmployeeFamilyDetailID,
    EmployeeID,
    Relation,
    Student,
    Name,
    Insured,
    DateOfBirth,
    Occupation,
    Gender,
    OtherInsurance,
    Dependant,
    GraduationDate,
    Address,
    Comments,
    Minor,
    SSN,
    GuardianAddress,
    GuardianName,
    Smoker,
    IsSubmit,
    IsDelete,
    CreatedBy,
    CreatedDate,
    UpdatedBy,
    UpdatedDate,
    AadharNumber,
    CreatedDateUtc,
    UpdatedDateUtc,
    LastmodifiedOn
)
SELECT
    Live.EmployeeFamilyDetailID,
    Live.EmployeeID,
    Live.Relation,
    Live.Student,
    Live.Name,
    Live.Insured,
    Live.DateOfBirth,
    Live.Occupation,
    Live.Gender,
    Live.OtherInsurance,
    Live.Dependant,
    Live.GraduationDate,
    Live.Address,
    Live.Comments,
    Live.Minor,
    Live.SSN,
    Live.GuardianAddress,
    Live.GuardianName,
    Live.Smoker,
    Live.IsSubmit,
    Live.IsDelete,
    Live.CreatedBy,
    Live.CreatedDate,
    Live.UpdatedBy,
    Live.UpdatedDate,
    Live.AadharNumber,
    Live.CreatedDateUtc,
    Live.UpdatedDateUtc,
    GETDATE()
FROM dbo.TEmployeeFamilyDetails AS Live
WHERE Live.EmployeeId = @EmployeeId
    AND Live.EmployeeFamilyDetailID = @FamilyDetailId
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.TEmployeeFamilyDetails_history AS History
        WHERE History.EmployeeFamilyDetailID = Live.EmployeeFamilyDetailID
            AND History.EmployeeId = Live.EmployeeId
            AND History.UpdatedDateUtc >= Live.UpdatedDateUtc
    );

SELECT @@ROWCOUNT AS HistoryRowsInserted;

-- Review the INSERT, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

------------------------------------------------------------------------------
-- 3) Confirm (run after COMMIT)
------------------------------------------------------------------------------
SELECT TOP (10)
    History.EmployeeFamilyDetailhistoryID,
    History.EmployeeFamilyDetailID,
    History.Name,
    History.Relation,
    History.UpdatedBy,
    History.UpdatedDateUtc,
    History.LastmodifiedOn
FROM dbo.TEmployeeFamilyDetails_history AS History
WHERE History.EmployeeId = @EmployeeId
    AND History.EmployeeFamilyDetailID = @FamilyDetailId
ORDER BY
    History.UpdatedDateUtc DESC,
    History.EmployeeFamilyDetailhistoryID DESC;
