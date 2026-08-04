ALTER PROCEDURE [dbo].[SP_Create_AdminWM_GetLocationByEmployeeId]
(
    @EmployeeID INT = NULL,
    @EmployerId INT
)
AS
/*
    -- =============================================
    -- Author:       Chatla Jagapathi
    -- Create date:  28th May 2025
    -- Description:  Returns locations accessible to an employee or employer.
    -- ==========================================================================================
    -- EXEC SP_Create_AdminWM_GetLocationByEmployeeId 25
    -- ==========================================================================================
    --   Modified by        Date            Reason
    -- ==========================================================================================
    --   Hanh Nguyen        22 Jun 2026     Perf: resolve UserID once, split OR into IF/ELSE,
    --                                      materialise STRING_SPLIT, remove debug PRINT
    -- ==========================================================================================
*/
BEGIN
    SET NOCOUNT ON
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED

    DECLARE @LocationIds        VARCHAR(MAX)
           ,@lv_EmployerId      INT
           ,@lv_RoleId          INT
           ,@lv_RootEmployerId  INT
           ,@lv_UserId          INT

    IF @EmployeeID IS NULL
    BEGIN
        SET @lv_EmployerId = @EmployerId

        SELECT @lv_RootEmployerId = RootEmployerId
        FROM tEmployerDetails
        WHERE EmployerId = @lv_EmployerId

        SELECT
            L.LocationId,
            CONCAT(LocationName, ' - (', ED.EmployerName, ')') AS LocationName,
            L.CountryId,
            L.Address1,
            L.Address2,
            L.ZipCode,
            L.PhoneNumber,
            L.Fax,
            L.OtherPhoneNumber,
            L.OtherFax,
            L.IsActive,
            L.UpdatedBy,
            L.Updatedate,
            L.CreatedBy,
            L.CreatedDate,
            L.Employerid,
            L.TimeZone,
            L.CreatedDateUtcTime,
            L.UpdatedateUtcTime,
            L.TimeZoneId,
            c.NAME AS [Country]
        FROM dbo.TEmployerDetails ED
        INNER JOIN dbo.TLocation L   ON L.Employerid = ED.Employerid AND L.IsActive = 1
        INNER JOIN dbo.TCOUNTRY  c   ON c.ID = L.CountryId
        WHERE ED.RootEmployerId = @lv_RootEmployerId
        ORDER BY L.LocationName
    END
    ELSE
    BEGIN
        -- Resolve UserID once; reused for both TUsers and TUSerPagesMapping lookups below
        SELECT @lv_UserId = userid
        FROM TUserEmployee
        WHERE EmployeeID = @EmployeeID

        SELECT @lv_RoleId    = RoleId
              ,@lv_EmployerId = EmployerId
        FROM TUsers
        WHERE UserID = @lv_UserId

        SELECT @lv_RootEmployerId = RootEmployerId
        FROM tEmployerDetails
        WHERE EmployerId = @lv_EmployerId

        -- User-level location filter
        -- TODO: add ORDER BY <primary key col> for deterministic result
        SELECT TOP 1 @LocationIds = LocationIds
        FROM TUSerPagesMapping WITH (NOLOCK)
        WHERE UserID     = @lv_UserId
          AND EmployerId = @lv_EmployerId

        -- Merge with role-level location filter
        -- TODO: add ORDER BY <primary key col> for deterministic result
        SELECT TOP 1 @LocationIds = CASE
                WHEN @LocationIds IS NULL THEN RM.LocationIds
                ELSE @LocationIds + ',' + ISNULL(RM.LocationIds, '')
            END
        FROM TRolePagesMapping RM WITH (NOLOCK)
        WHERE RoleId     = @lv_RoleId
          AND EmployerId = @lv_EmployerId

        IF ISNULL(@LocationIds, '') = ''
        BEGIN
            -- No location restriction — return all locations under the root employer
            SELECT
                L.LocationId,
                CONCAT(LocationName, ' - (', ED.EmployerName, ')') AS LocationName,
                L.CountryId,
                L.Address1,
                L.Address2,
                L.ZipCode,
                L.PhoneNumber,
                L.Fax,
                L.OtherPhoneNumber,
                L.OtherFax,
                L.IsActive,
                L.UpdatedBy,
                L.Updatedate,
                L.CreatedBy,
                L.CreatedDate,
                L.Employerid,
                L.TimeZone,
                L.CreatedDateUtcTime,
                L.UpdatedateUtcTime,
                L.TimeZoneId,
                c.NAME AS [Country]
            FROM dbo.TEmployerDetails ED
            INNER JOIN dbo.TLocation L   ON L.Employerid = ED.Employerid AND L.IsActive = 1
            INNER JOIN dbo.TCOUNTRY  c   ON c.ID = L.CountryId
            WHERE ED.RootEmployerId = @lv_RootEmployerId
            ORDER BY L.LocationName
        END
        ELSE
        BEGIN
            -- Materialise split IDs once; lets the optimiser use a join instead of per-row STRING_SPLIT
            DECLARE @LocationTable TABLE (LocationId INT)
            INSERT INTO @LocationTable
            SELECT CAST(VALUE AS INT)
            FROM STRING_SPLIT(@LocationIds, ',')
            WHERE VALUE <> ''

            SELECT
                L.LocationId,
                CONCAT(LocationName, ' - (', ED.EmployerName, ')') AS LocationName,
                L.CountryId,
                L.Address1,
                L.Address2,
                L.ZipCode,
                L.PhoneNumber,
                L.Fax,
                L.OtherPhoneNumber,
                L.OtherFax,
                L.IsActive,
                L.UpdatedBy,
                L.Updatedate,
                L.CreatedBy,
                L.CreatedDate,
                L.Employerid,
                L.TimeZone,
                L.CreatedDateUtcTime,
                L.UpdatedateUtcTime,
                L.TimeZoneId,
                c.NAME AS [Country]
            FROM dbo.TEmployerDetails ED
            INNER JOIN dbo.TLocation    L  ON L.Employerid = ED.Employerid AND L.IsActive = 1
            INNER JOIN dbo.TCOUNTRY     c  ON c.ID = L.CountryId
            INNER JOIN @LocationTable   LT ON LT.LocationId = L.LocationId
            ORDER BY L.LocationName
        END
    END

    SET NOCOUNT OFF
END
