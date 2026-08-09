# Grade Not Selected Even Though Designation Has a Grade Mapped

**Scenario:** Designation shows selected on the Employment Details tab, but
Grade shows blank — even though the Designation has a Grade mapped to it.

`PersonalInformation.aspx.cs` only re-derives Grade from the Designation-Grade
mapping (`SetSelectedDesignatinGradeName`) when a user interactively changes
the Designation dropdown (`cboJobTitle_SelectedIndexChanged`, lines
3856-3873). On page load for an existing employee, Grade selection comes ONLY
from the employee's stored `TEmployeeInfo.Grade` value
(`populateEmployeeOfficialInformation`, lines 3294-3297) — it is never
re-derived from `TTitle.Gradeid` on load. An employee whose stored Grade is
blank or out of sync with their Designation's mapped Grade will show the
Designation selected but Grade blank.

Separately, the Grade dropdown is only populated from `TGrade` rows where
`IsActive = 1 AND Employerid = @EmployerId` (`SP_SEP_GetGradeDetails`). If the
Designation's mapped Grade is inactive or belongs to a different
`EmployerId`, it won't be selectable even via the interactive path.

**Not yet fixed.** This script is for confirming the data-level root cause
before deciding on a UI fix (e.g. re-deriving Grade from the Designation
mapping on page load, not just on interactive change).

## Scripts in this folder

| Script | Type | Purpose |
|---|---|---|
| `diagnose-grade-designation-mismatch.sql` | read-only | Check one employee's stored Grade vs. their Designation's mapped Grade, and whether that mapped Grade would even appear in the dropdown. |
