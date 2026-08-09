-- =============================================================================
-- diagnose-grade-designation-mismatch.sql
--
-- Purpose:  For a single employee, checks whether the Grade shown as blank on
--           HRM/EmployeeInformation/PersonalInformation.aspx (Employment
--           Details tab) is explained by:
--             (a) the employee's stored Grade (TEmployeeInfo.Grade) being
--                 blank/out of sync with the Grade mapped to their current
--                 Designation (TTitle.Gradeid), or
--             (b) that mapped Grade being inactive or belonging to a
--                 different EmployerId, which would make it silently fail to
--                 appear in the Grade dropdown even if the code tried to
--                 select it.
--
-- Why:      PersonalInformation.aspx.cs only re-derives Grade from the
--           Designation-Grade mapping (SetSelectedDesignatinGradeName) when
--           the user interactively changes the Designation dropdown
--           (cboJobTitle_SelectedIndexChanged, PersonalInformation.aspx.cs:3856-3873).
--           On page load for an existing employee, Grade selection comes ONLY
--           from the employee's stored TEmployeeInfo.Grade value
--           (populateEmployeeOfficialInformation, PersonalInformation.aspx.cs:3294-3297)
--           - it is never re-derived from the Designation mapping on load.
--           So an employee whose stored Grade is blank or out of sync with
--           their Designation's mapped Grade will show the Designation
--           selected but Grade blank.
--
--           Separately, BindGradeBandDrp() only populates the Grade dropdown
--           with rows from TGrade where IsActive = 1 AND Employerid =
--           @EmployerId (SP_SEP_GetGradeDetails). If the Designation's mapped
--           Grade is inactive or belongs to a different EmployerId, it won't
--           be in that list, so even the interactive re-select path would
--           silently fail to select it.
--
-- When to use: an employee's Designation shows selected but Grade is blank
--           on the Employment Details tab, and you want to confirm (against
--           real data) which of the above explains it before touching the UI
--           code.
--
-- Inputs:   Set ONE of the two below - whichever you have on hand (support
--           tickets and the UI usually only show EmploymentNumber, not the
--           internal EmployeeId):
--             @EmployeeId       - the employee's internal EmployeeId.
--             @EmploymentNumber - the employee's EmploymentNumber; resolved
--                                 to @EmployeeId automatically below. Leave
--                                 NULL if you're setting @EmployeeId instead.
--
-- Notes:    - Read-only (SELECT only). No temp objects, no writes.
--           - Employer scoping mirrors the app: SetupMasterDAL.GetAllTitleList
--             and EmployeeBLL.GetGradeDetails both key off TEmployeeInfo.EmployerID
--             for this employee, not TEmployee.Employerid - transferred
--             employees can differ between the two.
-- =============================================================================

DECLARE @EmployeeId INT = 1431;                    -- <<< set this if you have the EmployeeId
DECLARE @EmploymentNumber NVARCHAR(20) = NULL;      -- <<< or set this instead, e.g. 'E0001'

IF @EmploymentNumber IS NOT NULL
    SELECT @EmployeeId = EmployeeId
    FROM TEmployeeInfo WITH (NOLOCK)
    WHERE EmploymentNumber = @EmploymentNumber;

SELECT
    e.EmployeeId,
    e.FName + ' ' + e.LName                           AS EmployeeName,
    ei.EmploymentNumber,
    ei.EmployerID                                      AS EmployeeEmployerId,

    cs.IsGradeEnable,

    ei.Title                                           AS DesignationId,
    t.Title                                            AS DesignationName,
    t.IsActive                                          AS DesignationIsActive,
    t.Employerid                                        AS DesignationEmployerId,
    t.Gradeid                                           AS DesignationMappedGradeId,
    gMapped.GradeName                                   AS DesignationMappedGradeName,
    gMapped.IsActive                                    AS DesignationMappedGradeIsActive,
    gMapped.Employerid                                  AS DesignationMappedGradeEmployerId,
    CASE WHEN gMapped.GradeId IS NOT NULL
              AND gMapped.IsActive = 1
              AND gMapped.Employerid = ei.EmployerID
         THEN 'Y' ELSE 'N' END                          AS MappedGradeWouldAppearInDropdown,

    ei.Grade                                            AS EmployeeStoredGradeId,
    gStored.GradeName                                   AS EmployeeStoredGradeName,
    ei.GradeBand                                        AS EmployeeStoredGradeBand,

    CASE
        WHEN cs.IsGradeEnable IS NULL OR cs.IsGradeEnable = 0
            THEN 'IsGradeEnable is off for this employer - Grade auto-select from Designation is not active; not this bug.'
        WHEN t.Gradeid IS NULL
            THEN 'Designation has no Grade mapped (TTitle.Gradeid is NULL) - nothing for the page to auto-select.'
        WHEN ei.Grade IS NULL
            THEN 'Employee.Grade is blank while the Designation maps to a Grade - matches the reported bug (Designation shows selected, Grade shows blank on load).'
        WHEN ei.Grade <> t.Gradeid
            THEN 'Employee.Grade does not match the Designation-mapped Grade - out of sync.'
        WHEN gMapped.IsActive = 0 OR gMapped.Employerid <> ei.EmployerID
            THEN 'Designation-mapped Grade is inactive or belongs to a different EmployerId - would not appear in the Grade dropdown list even on manual re-select.'
        ELSE 'Employee.Grade matches the Designation-mapped Grade - no mismatch found for this employee.'
    END AS Diagnosis

FROM TEmployee e WITH (NOLOCK)
INNER JOIN TEmployeeInfo ei WITH (NOLOCK) ON ei.EmployeeId = e.EmployeeId
LEFT JOIN TTitle t WITH (NOLOCK) ON t.ID = ei.Title
LEFT JOIN TGrade gMapped WITH (NOLOCK) ON gMapped.GradeId = t.Gradeid
LEFT JOIN TGrade gStored WITH (NOLOCK) ON gStored.GradeId = ei.Grade
LEFT JOIN TCustomerSettings cs WITH (NOLOCK) ON cs.EmployerId = ei.EmployerID
WHERE e.EmployeeId = @EmployeeId;
