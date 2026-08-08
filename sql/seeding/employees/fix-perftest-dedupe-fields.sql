/* =============================================================================
   Fix My Details Oops on perf-test tenants (C00232 / 232-234).

   Root cause:
     TEmployeeDetail_Fields was cloned twice (1122 rows vs template 561).
     PersonalInformation → ucEmployeeSummary.GetFieldDetails →
     MyDetailsFieldHelper.ChangeVisiblityBasedOnParentField does
       .ToDictionary(x => x.ColumnName, ...)
     Duplicate ColumnName values throw ArgumentException (outside Page_Load
     try/catch) → Application_Error → Error.aspx / Oops.

   Also clones missing MenuId=5 TRoleTabDetails for RoleId 1/3/4 from a
   healthy employer (template 10 has MenuId=5 only on custom roles, not 1/3/4),
   and clones TEmployeeSearchPurposeMaster if empty.

   Edit @CustId if needed. Idempotent.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @CustId             VARCHAR(10) = 'C00232';
DECLARE @TemplateEmployerId INT         = 10;
DECLARE @RoleTabSourceId    INT         = 1;   -- healthy MenuId=5 for roles 1/3/4

DECLARE @RootEmployerId INT =
    (SELECT Employerid FROM dbo.TEmployerDetails WHERE custid = @CustId);

IF @RootEmployerId IS NULL
    THROW 50000, 'Employer not found for that custid.', 1;

DECLARE @Employers TABLE (EmployerId INT PRIMARY KEY);
INSERT INTO @Employers (EmployerId)
SELECT Employerid
FROM dbo.TEmployerDetails
WHERE Employerid = @RootEmployerId
   OR ParentEmployerid = @RootEmployerId;

BEGIN TRAN FixDedupeFields;

------------------------------------------------------------------------------
-- 1. Deduplicate TEmployeeDetail_Fields (keep lowest FieldID per logical row)
------------------------------------------------------------------------------
;WITH dups AS (
    SELECT f.FieldID,
           ROW_NUMBER() OVER (
               PARTITION BY f.EmployerId, f.FieldName, f.SectionID, f.CountryID,
                            f.DisplayText, f.DB_Column, f.FieldEntity
               ORDER BY f.FieldID
           ) AS rn
    FROM dbo.TEmployeeDetail_Fields f
    WHERE f.EmployerId IN (SELECT EmployerId FROM @Employers)
)
DELETE FROM dbo.TEmployeeDetail_Fields
WHERE FieldID IN (SELECT FieldID FROM dups WHERE rn > 1);

PRINT 'Deduped TEmployeeDetail_Fields. Remaining:';
SELECT e.EmployerId, COUNT(*) AS FieldCnt
FROM dbo.TEmployeeDetail_Fields f
INNER JOIN @Employers e ON e.EmployerId = f.EmployerId
GROUP BY e.EmployerId
ORDER BY e.EmployerId;

------------------------------------------------------------------------------
-- 2. MenuId=5 role tabs for Admin/Manager/Employee (roles 1/3/4)
------------------------------------------------------------------------------
DELETE rt
FROM dbo.TRoleTabDetails rt
INNER JOIN @Employers e ON e.EmployerId = rt.Employerid
WHERE rt.MenuId = 5
  AND rt.RoleId IN (1, 3, 4);

INSERT INTO dbo.TRoleTabDetails (RoleId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate)
SELECT src.RoleId, src.MenuId, src.TabId, e.EmployerId, src.IsEditable, ISNULL(src.CreatedBy, 1), CAST(GETDATE() AS DATE)
FROM dbo.TRoleTabDetails src
CROSS JOIN @Employers e
WHERE src.Employerid = @RoleTabSourceId
  AND src.MenuId = 5
  AND src.RoleId IN (1, 3, 4);

PRINT 'Cloned MenuId=5 TRoleTabDetails for roles 1/3/4 onto perf employers.';

------------------------------------------------------------------------------
-- 3. Employee search purpose master (used by Employee Summary dropdown)
------------------------------------------------------------------------------
INSERT INTO dbo.TEmployeeSearchPurposeMaster
    (EmployerId, EmployeeSearchPurpose, IsActive, CreatedBy, CreateDate)
SELECT e.EmployerId, src.EmployeeSearchPurpose, src.IsActive, ISNULL(src.CreatedBy, 1), GETDATE()
FROM dbo.TEmployeeSearchPurposeMaster src
CROSS JOIN @Employers e
WHERE src.EmployerId = @TemplateEmployerId
  AND NOT EXISTS (
        SELECT 1
        FROM dbo.TEmployeeSearchPurposeMaster x
        WHERE x.EmployerId = e.EmployerId
      );

PRINT 'Cloned TEmployeeSearchPurposeMaster where missing.';

------------------------------------------------------------------------------
-- 4. Donor tab flag — avoid Budget Source tab noise on perf tenants
------------------------------------------------------------------------------
UPDATE dbo.TCustomerSettings
SET IsDonorDetails = 0
WHERE EmployerId IN (SELECT EmployerId FROM @Employers);

COMMIT TRAN FixDedupeFields;

SELECT 'TEmployeeDetail_Fields' AS Obj, EmployerId, COUNT(*) AS Cnt
FROM dbo.TEmployeeDetail_Fields
WHERE EmployerId IN (SELECT EmployerId FROM @Employers)
GROUP BY EmployerId
UNION ALL
SELECT 'TRoleTabDetails Menu5 roles 1/3/4', Employerid, COUNT(*)
FROM dbo.TRoleTabDetails
WHERE Employerid IN (SELECT EmployerId FROM @Employers)
  AND MenuId = 5 AND RoleId IN (1, 3, 4)
GROUP BY Employerid
UNION ALL
SELECT 'TEmployeeSearchPurposeMaster', EmployerId, COUNT(*)
FROM dbo.TEmployeeSearchPurposeMaster
WHERE EmployerId IN (SELECT EmployerId FROM @Employers)
GROUP BY EmployerId
ORDER BY 1, 2;

PRINT 'Done. Sign out/in recommended so TAB_BY_ROLE session reloads MenuId=5.';
PRINT 'Then reopen /HRM/EmployeeInformation/PersonalInformation.aspx';
