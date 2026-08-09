# Menu / Tab Access Troubleshooting

Scenarios worth checking when a menu item or a tab within a page isn't
showing up as expected — either for one employee, or for an employer as a
whole. Grounded in the actual stored-procedure logic (file:line references
point at `HRMS-DATABASE/HRMS/STOREPROCEDURE/` and `HRMS-DATABASE/HRMS/TABLES/`
in the `TDG HRMS DB` repo). See that repo's `llm-wiki/architecture/auth-flow.md`
and `llm-wiki/experience/surfaces.md` for the broader page/tab access model.

**Layout note:** like `troubleshooting/employee/`, this folder groups
scripts one subfolder per issue — each subfolder is self-contained (its own
README, scripts, and any RCA doc).

## Scenarios

1. **An employee is missing a left-menu item or a tab that a peer with the
   "same" role can see** — the menu/tab is already correctly set up for
   the tenant; the question is why *this employee* doesn't see it.
   → [`employee-missing-menu-or-tab/`](employee-missing-menu-or-tab/README.md)

2. **A menu was created in the database but doesn't appear for a given
   employer at all** — including in the `RoleManagement.aspx` "Dynamic
   Menu" hierarchy tab itself. Four independent causes (master row,
   hierarchy link, a stale admin-tab XML cache, and missing role/user
   grants) can each produce this symptom on their own.
   → [`menu-created-but-not-visible/`](menu-created-but-not-visible/README.md)
