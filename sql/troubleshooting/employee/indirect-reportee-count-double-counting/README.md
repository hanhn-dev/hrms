# Indirect Reportee Count Double-Counting

**Scenario:** "Indirect Reportees" count is inflated, or the same employee
shows up in both the Direct and Indirect report lists.

`Sp_CM_Mydetails_DirectIndirectReports.sql:111-114` and
`Sp_CM_Mydetails_DirectIndirectReports_Count.sql:92-95` walk two
*independent* hierarchies to answer "who reports to this employee":
- org-chart (`TORGChart.ReportsTo`)
- functional / dotted-line (`TEmployeeInfo.FunctionalManager`)

Each employee gets a `RankLevel` (distance from "self") in each tree
separately. The scope-building step then classifies:
- **Direct** (`@RankLevel=0`) = anyone at `RankLevel = 1` in *either* tree.
- **Indirect** (`@RankLevel=1`) = anyone at `RankLevel >= 2` in *either* tree.

Nothing excludes an employee from the Indirect bucket if they are already
Direct via the *other* tree. So in a matrix org — functional manager is
"self", but the org-chart manager is someone else two-plus levels up — that
employee is Direct via one tree and Indirect via the other, and gets counted
(and displayed) in **both** buckets. This inflates the Indirect count and can
duplicate the employee across both lists on My Details.

Confirmed live on `HRM-CL-Prod`: EmployeeId 29's `FunctionalManager` is 33
(Direct, functional rank 1), but its org-chart chain is `29 → 12 → 33` (org
rank 2, Indirect). Employee 29 lands in both buckets for manager 33.

**Not yet fixed.** The `ELSE IF @RankLevel = 1` branch in both procs needs to
exclude, from the Indirect set, anyone already present in the Direct set
built from the other hierarchy. No code change has been applied — these
scripts are for confirming/reproducing the issue before requesting one.

## Scripts in this folder

| Script | Type | Purpose |
|---|---|---|
| `diagnose-indirect-reportee-count.sql` | read-only | Check one manager's Direct/Indirect counts (current buggy vs. corrected). |
| `find-direct-indirect-reportee-overlap.sql` | read-only | Scan for every manager/tenant affected by the overlap. |
| `rca-indirect-reportee-count-double-counting.md` | doc | Full writeup, including a live reproduction against manager EmployeeId 1431. |
