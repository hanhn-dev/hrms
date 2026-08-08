# RCA: "Indirect Reportees" count is inflated by double-counted employees

| | |
| --- | --- |
| **Status** | Root cause confirmed and reproduced against live data. **No fix applied yet.** |
| **Affected objects** | `Sp_CM_Mydetails_DirectIndirectReports.sql`, `Sp_CM_Mydetails_DirectIndirectReports_Count.sql` |
| **Symptom** | "Indirect Reportees" count on My Details is higher than expected; the same employee can appear in both the Direct and Indirect report lists for the same manager. |
| **Verified against** | `HRM-CL-Prod`, manager EmployeeId `1431` |
| **Related scripts** | `diagnose-indirect-reportee-count.sql`, `find-direct-indirect-reportee-overlap.sql` (this folder) |

## Summary

Both procedures compute "who reports to this employee" by walking **two independent
hierarchies** and ranking every employee's distance from "self" in each:

- **Org-chart hierarchy** — `TORGChart.ReportsTo`
- **Functional (dotted-line) hierarchy** — `TEmployeeInfo.FunctionalManager`

An employee is classified as **Direct** if they are one step away in *either* tree,
and **Indirect** if they are two-or-more steps away in *either* tree. The Indirect
classification never checks whether that same employee is *already* Direct via the
other tree. In a matrix org, that's a common combination — and it means one employee
can legitimately satisfy both conditions at once, so they get inserted into the
result set for **both** the Direct query and the Indirect query.

## Where the bug is

The scope-building step (identical logic in both procedures):

- `Sp_CM_Mydetails_DirectIndirectReports_Count.sql:88-95`
- `Sp_CM_Mydetails_DirectIndirectReports.sql:107-114`

```sql
ELSE IF @RankLevel = 0                                          -- Direct
    INSERT INTO #Scope(EmployeeId)
    SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel = 1
    UNION SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel = 1;
ELSE IF @RankLevel = 1                                          -- Indirect
    INSERT INTO #Scope(EmployeeId)
    SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel >= 2
    UNION SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel >= 2;
```

The Direct branch is correct by design: "Direct" means rank 1 in *either* tree,
which is exactly what a matrix org needs. The Indirect branch is the defect: it
takes rank ≥2 in *either* tree, but never excludes an employee who is rank 1
(Direct) in the *other* tree. Nothing in the surrounding procedure reconciles the
two classifications against each other.

## Concrete reproduction

Manager **1431** (from a live support report of a wrong Indirect count):

| Check | Result |
| --- | --- |
| `Sp_CM_Mydetails_DirectIndirectReports_Count` → Direct | **97** (confirmed exact match against the UI) |
| `Sp_CM_Mydetails_DirectIndirectReports_Count` → Indirect (current behavior) | **250** (confirmed exact match against the UI) |
| Indirect, recomputed excluding anyone already Direct via the other tree | **225** |
| Employees counted in both buckets | **25** (`250 − 225`) |

One of those 25, employee **14498**, illustrates the exact mechanism:

- Org-chart: reports to **1435**, who reports to **1431** → org distance 2 → *Indirect* by the org tree.
- Functional: `FunctionalManager = 1431` directly → functional distance 1 → *Direct* by the functional tree.
- Active, has a resolvable Title, and passes the Location/BU visibility filter (`FN_LocationBU_GetAllActiveInActive_EmployeeDetails`) applied to 1431's view — so nothing else in the procedure filters this employee out. They are inserted into `#Scope` for both `@RankLevel=0` (Direct) and `@RankLevel=1` (Indirect), and are visible on-screen in both tabs simultaneously.

This was validated by reproducing the procedures' full logic — same hierarchy walk,
same `TTitle` join, same `FN_LocationBU_GetAllActiveInActive_EmployeeDetails`
visibility join, same role-based active-employee filter — in
`diagnose-indirect-reportee-count.sql`, which reproduces the UI's own numbers
exactly before showing the corrected figure.

## Why this wasn't caught by the org/functional "independent walk" fix

A prior change (`Cursor Agent`, 2026-08-04, per both procedures' modification
history) fixed the *traversal* so the org and functional hierarchies walk
independently instead of interfering with each other's rank levels. That fix was
necessary but not sufficient: it corrected how each tree's `RankLevel` is computed,
but the *classification* step that turns those two rank levels into "Direct" vs.
"Indirect" buckets still never cross-checks one tree's Direct set against the
other tree's Indirect set.

## Proposed fix

In both procedures, change the `@RankLevel = 1` branch to exclude anyone who is
Direct (`RankLevel = 1`) in the other hierarchy:

```sql
ELSE IF @RankLevel = 1
    INSERT INTO #Scope(EmployeeId)
    SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel >= 2
        AND EmployeeId NOT IN (SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel = 1)
    UNION SELECT EmployeeId FROM #lv_HierarchyFun WHERE RankLevel >= 2
        AND EmployeeId NOT IN (SELECT EmployeeId FROM #lv_Hierarchy WHERE RankLevel = 1);
```

This has not been applied to either procedure. `@RankLevel = -2` (Direct+Indirect
combined) is unaffected either way, since it already unions `RankLevel >= 1` from
both trees into a single deduplicated set.

## Addendum: a real cycle in `TEmployeeInfo.FunctionalManager`

While building `find-direct-indirect-reportee-overlap.sql`, an unguarded
recursive-CTE version of the hierarchy walk produced wildly inflated overlap
counts (135 structural / 129 visible vs. the trusted 25 from
`diagnose-indirect-reportee-count.sql`). The cause was **not** a filtering
difference - it was a genuine two-person cycle in the live data: employees
**13461** and **13464** each have the other set as `FunctionalManager`
(confirmed on `HRM-CL-Prod`). A recursive CTE with no "already visited" guard
walks a cycle like this repeatedly up to its recursion cap, fabricating many
spurious deep "indirect" relationships.

Both `Sp_CM_Mydetails_DirectIndirectReports[_Count]` and this folder's
scripts avoid the problem the same way: the hierarchy walk is a `WHILE` loop
that inserts each employee into a temp table exactly once (`NOT EXISTS`
guard), so a cycle just causes the walk to stop naturally instead of growing
unbounded. `find-direct-indirect-reportee-overlap.sql` was rewritten to use
this same cycle-safe, single-manager walk instead of an unscoped ancestor
closure.

This cycle is a separate, real data-quality issue in its own right - worth
knowing about for anyone writing a *new* recursive query against
`TEmployeeInfo.FunctionalManager` without a visited-node guard, independent
of the double-counting bug above.

## How to verify on another manager

Run `diagnose-indirect-reportee-count.sql` with `@EmployeeId` set to the manager
in question. Its first result set gives `DirectCount` / `IndirectCount_CurrentBuggy`
(should match the UI) and `IndirectCount_Corrected`; its second result set lists
every double-counted employee and which hierarchy makes them Direct vs. Indirect.
Use `find-direct-indirect-reportee-overlap.sql` to scan for every manager/tenant
currently affected.
