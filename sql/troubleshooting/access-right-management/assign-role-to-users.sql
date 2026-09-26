-- =============================================================================
-- assign-role-to-users.sql
--
-- Purpose:  Assign an Access Right Management role to one or more users
--           (TUsers.RoleID). Optionally set ReportingType, IsGlobalAccess,
--           and EmployerIds. Writes TUsersHistory first, matching
--           SP_AdminRoleM_ChangeuserRole — without the workflow queue or
--           SP_SendGlobalAccessNotification email.
--
-- UI:       RoleManagement.aspx → Users → Submit
--
-- WRITE script. Does not copy role pages onto the user (the UI does not
--           either). Additional page/tab overrides stay until
--           grant-or-revoke-user-permissions.sql changes them.
--
-- Inputs:   @EmployerId            required
--           @RoleId                required unless @RoleName is set
--           @RoleName              lookup if @RoleId is 0
--           @EmploymentNumbers     comma list, e.g. 'E0001,E0002'
--           @UserIds               comma list of TUsers.UserID if numbers blank
--           @UpdatedBy             required audit id
--           @ReportingTypeLabel    optional: Employee / Manager / Administrator
--                                  (blank = leave each user's current value)
--           @IsGlobalAccess        optional Y / N (blank = leave current)
--           @EmployerIds           comma tenant ids when Global Access = Y;
--                                  cleared automatically when N
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @EmployerId INT = 0;                          -- <<< REQUIRED
DECLARE @RoleId INT = 0;                              -- <<< required unless @RoleName
DECLARE @RoleName VARCHAR(100) = '';
DECLARE @EmploymentNumbers VARCHAR(MAX) = '';         -- <<< or @UserIds
DECLARE @UserIds VARCHAR(MAX) = '';
DECLARE @UpdatedBy INT = 0;                           -- <<< REQUIRED
DECLARE @ReportingTypeLabel VARCHAR(50) = '';         -- optional
DECLARE @IsGlobalAccess CHAR(1) = '';                 -- optional Y/N
DECLARE @EmployerIds VARCHAR(MAX) = '';               -- used when Global Access = Y

IF @EmployerId <= 0
    OR @UpdatedBy <= 0
BEGIN
    THROW 50000, 'Set @EmployerId and @UpdatedBy before running.', 1;
END;

IF @RoleId <= 0
    AND NULLIF(LTRIM(RTRIM(@RoleName)), '') IS NULL
BEGIN
    THROW 50000, 'Set @RoleId or @RoleName.', 1;
END;

IF NULLIF(LTRIM(RTRIM(@EmploymentNumbers)), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(@UserIds)), '') IS NULL
BEGIN
    THROW 50000, 'Set @EmploymentNumbers or @UserIds.', 1;
END;

IF NULLIF(LTRIM(RTRIM(@IsGlobalAccess)), '') IS NOT NULL
    AND UPPER(@IsGlobalAccess) NOT IN ('Y', 'N')
BEGIN
    THROW 50000, '@IsGlobalAccess must be Y, N, or blank.', 1;
END;

IF NULLIF(LTRIM(RTRIM(@ReportingTypeLabel)), '') IS NOT NULL
    AND @ReportingTypeLabel NOT IN ('Employee', 'Manager', 'Administrator')
BEGIN
    THROW 50000, '@ReportingTypeLabel must be Employee, Manager, Administrator, or blank.', 1;
END;

IF @RoleId <= 0
BEGIN
    SELECT TOP (1)
        @RoleId = Roles.RoleID
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleName = LTRIM(RTRIM(@RoleName))
        AND (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
        )
    ORDER BY
        CASE WHEN Roles.Employerid = @EmployerId THEN 0 ELSE 1 END,
        Roles.RoleID;
END;

IF @RoleId IS NULL
    OR @RoleId <= 0
    OR NOT EXISTS (
        SELECT 1
        FROM dbo.TRoles AS Roles
        WHERE Roles.RoleID = @RoleId
            AND Roles.IsActive = 'Y'
    )
BEGIN
    THROW 50000, 'Active role was not found for this tenant.', 1;
END;

DECLARE @ResolvedReportingType INT = NULL;

IF NULLIF(LTRIM(RTRIM(@ReportingTypeLabel)), '') IS NOT NULL
BEGIN
    SELECT TOP (1)
        @ResolvedReportingType = Roles.RoleID
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleName = LTRIM(RTRIM(@ReportingTypeLabel))
        AND Roles.IsActive = 'Y'
        AND (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = @EmployerId))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = @EmployerId)
        )
    ORDER BY
        CASE WHEN Roles.Employerid = @EmployerId THEN 0 ELSE 1 END,
        Roles.RoleID;

    IF @ResolvedReportingType IS NULL
    BEGIN
        THROW 50000, 'Could not resolve @ReportingTypeLabel to a TRoles.RoleID.', 1;
    END;
END;

DECLARE @TargetUsers TABLE (
    UserId INT NOT NULL PRIMARY KEY,
    EmployeeId INT NULL,
    EmploymentNumber NVARCHAR(20) NULL
);

IF NULLIF(LTRIM(RTRIM(@EmploymentNumbers)), '') IS NOT NULL
BEGIN
    INSERT INTO @TargetUsers (UserId, EmployeeId, EmploymentNumber)
    SELECT
        MAX(UserEmployee.UserID),
        EmployeeInfo.EmployeeId,
        EmployeeInfo.EmploymentNumber
    FROM STRING_SPLIT(@EmploymentNumbers, ',') AS NumberSplit
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmploymentNumber = LTRIM(RTRIM(NumberSplit.value))
    INNER JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.EmployeeID = EmployeeInfo.EmployeeId
    INNER JOIN dbo.TUsers AS Users
        ON Users.UserID = UserEmployee.UserID
        AND Users.Employerid = @EmployerId
    WHERE LTRIM(RTRIM(NumberSplit.value)) <> ''
    GROUP BY
        EmployeeInfo.EmployeeId,
        EmployeeInfo.EmploymentNumber;
END;
ELSE
BEGIN
    INSERT INTO @TargetUsers (UserId, EmployeeId, EmploymentNumber)
    SELECT
        Users.UserID,
        UserEmployee.EmployeeID,
        EmployeeInfo.EmploymentNumber
    FROM STRING_SPLIT(@UserIds, ',') AS UserSplit
    INNER JOIN dbo.TUsers AS Users
        ON Users.UserID = TRY_CAST(LTRIM(RTRIM(UserSplit.value)) AS INT)
        AND Users.Employerid = @EmployerId
    LEFT JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.UserID = Users.UserID
    LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = UserEmployee.EmployeeID
    WHERE LTRIM(RTRIM(UserSplit.value)) <> '';
END;

IF NOT EXISTS (
    SELECT 1
    FROM @TargetUsers
)
BEGIN
    THROW 50000, 'No matching TUsers rows for this employer. Check employment numbers / UserIDs.', 1;
END;

DECLARE @ResolvedGlobalAccess CHAR(1) = NULLIF(UPPER(LTRIM(RTRIM(@IsGlobalAccess))), '');
DECLARE @ResolvedEmployerIds VARCHAR(MAX) = CASE
    WHEN @ResolvedGlobalAccess = 'N' THEN ''
    ELSE NULLIF(LTRIM(RTRIM(@EmployerIds)), '')
END;

SELECT
    'TargetRole' AS DatasetType,
    Roles.RoleID,
    Roles.RoleName,
    @ResolvedReportingType AS ReportingTypeRoleId,
    @ResolvedGlobalAccess AS IsGlobalAccess,
    @ResolvedEmployerIds AS EmployerIds
FROM dbo.TRoles AS Roles
WHERE Roles.RoleID = @RoleId;

SELECT
    'UsersBefore' AS DatasetType,
    Users.UserID,
    TargetUsers.EmploymentNumber,
    Users.RoleID AS CurrentRoleId,
    CurrentRole.RoleName AS CurrentRoleName,
    Users.ReportingType AS CurrentReportingType,
    Users.IsGlobalAccess AS CurrentIsGlobalAccess,
    Users.EmployerIds AS CurrentEmployerIds
FROM @TargetUsers AS TargetUsers
INNER JOIN dbo.TUsers AS Users
    ON Users.UserID = TargetUsers.UserId
LEFT JOIN dbo.TRoles AS CurrentRole
    ON CurrentRole.RoleID = Users.RoleID;

BEGIN TRANSACTION;

INSERT INTO dbo.TUsersHistory (
    UserID,
    UserName,
    PasswordStr,
    RoleID,
    UserEmail,
    IsActive,
    ChangedOn,
    ChangedBy,
    Employerid,
    IsGlobalAccess,
    EmployerIds,
    HistoryCreatedBy,
    HistoryCreatedDate,
    ActionType
)
SELECT
    Users.UserID,
    Users.UserName,
    Users.PasswordStr,
    Users.RoleID,
    Users.UserEmail,
    Users.IsActive,
    ISNULL(Users.ModifiedDate, Users.CreatedDate),
    ISNULL(Users.ModifiedBy, Users.CreatedBy),
    Users.Employerid,
    Users.IsGlobalAccess,
    Users.EmployerIds,
    ISNULL(Users.ModifiedBy, Users.CreatedBy),
    ISNULL(Users.ModifiedDate, Users.CreatedDate),
    'U'
FROM dbo.TUsers AS Users
INNER JOIN @TargetUsers AS TargetUsers
    ON TargetUsers.UserId = Users.UserID
WHERE Users.Employerid = @EmployerId;

UPDATE Users
SET
    Users.RoleID = @RoleId,
    Users.ReportingType = COALESCE(@ResolvedReportingType, Users.ReportingType),
    Users.IsGlobalAccess = COALESCE(@ResolvedGlobalAccess, Users.IsGlobalAccess),
    Users.EmployerIds = CASE
        WHEN @ResolvedGlobalAccess = 'N' THEN ''
        WHEN @ResolvedEmployerIds IS NOT NULL THEN @ResolvedEmployerIds
        ELSE Users.EmployerIds
    END,
    Users.ModifiedBy = @UpdatedBy,
    Users.ModifiedDate = GETDATE()
FROM dbo.TUsers AS Users
INNER JOIN @TargetUsers AS TargetUsers
    ON TargetUsers.UserId = Users.UserID
WHERE Users.Employerid = @EmployerId;

-- Review the preview above, then choose one:
-- ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;

SELECT
    'UsersAfter' AS DatasetType,
    Users.UserID,
    TargetUsers.EmploymentNumber,
    Users.RoleID,
    NewRole.RoleName,
    Users.ReportingType,
    ReportingRole.RoleName AS ReportingTypeName,
    Users.IsGlobalAccess,
    Users.EmployerIds
FROM @TargetUsers AS TargetUsers
INNER JOIN dbo.TUsers AS Users
    ON Users.UserID = TargetUsers.UserId
LEFT JOIN dbo.TRoles AS NewRole
    ON NewRole.RoleID = Users.RoleID
LEFT JOIN dbo.TRoles AS ReportingRole
    ON ReportingRole.RoleID = Users.ReportingType;

PRINT 'Role assignment does not copy page mappings. Users must re-login. Uncomment COMMIT TRANSACTION after review.';
PRINT 'Global-access notification email was not sent (SP_SendGlobalAccessNotification skipped).';
