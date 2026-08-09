# Menu Created in the Database but Not Visible

**Scenario:** A menu item exists in the menu tables (an admin or a migration
created it), but for a given employer it doesn't show up — either in the
"Dynamic Menu" hierarchy tab on `RoleManagement.aspx`, or on any employee's
left menu at that tenant, or both.

There are four independent places a menu's setup can be incomplete, and
which one is missing changes what "not visible" actually means:

1. **Master row** (`tMenuDetails`) — missing or `ISActive = 0` for this
   `Employerid`.
2. **Hierarchy link** (`TMenuHierarchy`) — missing for this `Employerid`, or
   points at a `ParentMenuId` that itself has no row.
3. **Dynamic Menu tab cache** (`TDynamicMenuHierarchy`) — the admin
   hierarchy editor renders a **cached XML snapshot**, not a live query; a
   menu inserted directly into the tables never appears here until the
   cache is regenerated.
4. **Access grants** (`TRolePagesMapping` / `TUSerPagesMapping`) — even with
   1-3 all correct, no employee sees it in their left menu without a
   role or user grant for that `MenuId` at that `Employerid`.

See [`rca-menu-created-but-not-visible.md`](rca-menu-created-but-not-visible.md)
for the full writeup of each cause, including the confirmed code paths.

**Not a data-level bug** — unlike the other issues in this repo's
`employee/` folder, none of the four causes above is a defect to fix in a
stored procedure. This is a workflow/tooling gap: menus created outside
the `RoleManagement.aspx` "Dynamic Menu" tab's own tree-edit-and-Submit flow
(script, migration, ad-hoc `INSERT`) can land in an inconsistent state
across these four tables, and there is no single check that surfaces which
one was missed.

## Scripts in this folder

| Script | Type | Purpose |
| --- | --- | --- |
| `diagnose-menu-setup-by-employer.sql` | read-only | Given a menu name (or `MenuId`) and an `EmployerId`, checks all four causes above and reports which is missing. No specific employee needed — this is an employer-level / admin-hierarchy check, not a per-employee one. |

## How to verify

Set `@MenuName` (or `@MenuId`) and `@EmployerId` at the top of
`diagnose-menu-setup-by-employer.sql` and run it. Each of its five result
sets carries a `LikelyCause` column naming the specific gap; result set 3
("Dynamic Menu tab cache") is usually the one that answers "why doesn't the
admin see it in the hierarchy tab even though it's in the tables."

For a per-employee question instead ("why can't *this employee* see an
existing, correctly-set-up menu or tab") see
[`../employee-missing-menu-or-tab/`](../employee-missing-menu-or-tab/README.md)
instead.
