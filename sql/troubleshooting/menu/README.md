# Menu / Tab Access Troubleshooting

Scenarios worth checking when an employee is missing a left-menu item or a
tab within a page that peers with the "same" role can see. Grounded in the
actual stored-procedure logic (file:line references point at
`HRMS-DATABASE/HRMS/STOREPROCEDURE/` and `HRMS-DATABASE/HRMS/TABLES/` in the
`TDG HRMS DB` repo). See that repo's `llm-wiki/architecture/auth-flow.md` and
`llm-wiki/experience/surfaces.md` for the broader page/tab access model.

## How the runtime actually decides what to show

- **Left menu** — `sp_GetDynamicMenuItems.sql:57-122`. A menu item
  (`tMenuDetails`/`TMenuHierarchy`, `MenuId > 1`) shows for a user if **either**
  their role has a row in `TRolePagesMapping` **or** the user has a row in
  `TUSerPagesMapping` for that `MenuId` (there, still called `PageId` —
  despite the name, this is a `TMenuHierarchy.MenuID`, **not**
  `TModulePages.ModulePageId`). Every join also requires an exact `Employerid`
  match across `TUsers`/`TRolePagesMapping`/`TMenuHierarchy`/`tMenuDetails`,
  and `tMenuDetails.isactive = 1`. Same union pattern independently confirmed
  in `SP_RRS_GetHasMenuAccessByUser.sql:43-54`.
- **Tabs within a page** — `Sp_Get_UserMenuTab_Details.sql:24-38`. This reads
  **only** `TUserTabDetails` (joined through `TUserEmployee`), INNER JOINed
  to the `TTabDetails` master catalog on `TBD.Employerid = TUD.EmployerId`
  (exact match) — there is **no fallback to `TRoleTabDetails`** at runtime. A
  role-fallback UNION exists but is entirely commented out in the sibling
  admin procedure `Sp_GetTabUserDetails.sql:24-43`, confirming the fallback
  was written once and then disabled, not simply never built.

## Scenarios

1. **[CONFIRMED, tenant-wide] `TTabDetails` master catalog is missing for
   this employee's tenant.** Verified on `HRM-CL-Prod` (2026-08-09):
   `TTabDetails` only has rows for `Employerid` 0, 1, and 10 (314 rows
   total), while **55+ other tenants** (`Employerid` 11 up to at least 232)
   have real, populated per-user grants in `TUserTabDetails`. Because
   `Sp_Get_UserMenuTab_Details.sql` requires
   `TBD.Employerid = TUD.EmployerId` exactly, **every employee at every one
   of those 55+ tenants gets zero tabs back from this procedure, regardless
   of what is granted to their role or their user.** This is not a
   per-employee provisioning gap — it is a master-data/code gap that likely
   explains most "missing tab" reports outright. Left-menu visibility is
   unaffected (menu grants are genuinely tenant-scoped and working as
   designed) — this is specific to tabs.
   → `diagnose-menu-tab-access.sql` (result set 2, "Tab master tenant
     check" — run this first)

2. **User-level tab rows were never provisioned for this employee.**
   Only relevant for tenants where scenario 1 does *not* apply (i.e.
   `Employerid` 0, 1, or 10 today). Because `Sp_Get_UserMenuTab_Details.sql`
   only checks `TUserTabDetails`, an employee with zero rows there for a
   given `MenuId`/`TabId` sees **no tab on that page** — even though
   `TRoleTabDetails` shows their role has full access.
   → `diagnose-menu-tab-access.sql` (result set 3; flags
     `RoleTabGrant_InformationalOnly = Y` next to a missing per-user row)

3. **Neither the role nor the user has a `PageId` (=`MenuId`) row for a
   left-menu item.** `sp_GetDynamicMenuItems.sql`'s two UNION branches both
   require a `TRolePagesMapping` or `TUSerPagesMapping` row; if neither
   exists for `(RoleID/UserID, MenuId, Employerid)`, the item is absent from
   the left menu for that user only — other roles/users at the same tenant
   are unaffected.
   → `diagnose-menu-tab-access.sql` (result set 1, menu-level)

4. **The menu master itself is inactive or missing for the tenant.**
   `tMenuDetails.isactive = 0` (or no row at all for that `Employerid`) hides
   the item for **every** role and every user of that tenant, not just one
   employee — rules out a role/user-mapping problem and points at a
   tenant-config/master-data gap instead.
   → `diagnose-menu-tab-access.sql` (result set 1, `MasterIsActive`)

5. **`Employerid` mismatch across the join chain.** Every join in both SPs
   pins `Employerid` exactly (`TUsers`, `TRolePagesMapping`/`TUSerPagesMapping`,
   `TMenuHierarchy`, `tMenuDetails`, and the Tab equivalents). A stale/wrong
   `Employerid` on any one row (common after a manual data fix or tenant
   migration) silently drops that item — no error, just missing from the
   list.
   → `diagnose-menu-tab-access.sql` (`Employerid` shown per source table)

6. **Role changed but access rows weren't re-provisioned.** `TUsers.RoleID`
   was updated (promotion/transfer) but `TRolePagesMapping`/`TRoleTabDetails`
   for the *new* role were never set up, or the user's own
   `TUSerPagesMapping`/`TUserTabDetails` rows still reflect the old role's
   access.
   → `diagnose-menu-tab-access.sql` (shows current `RoleID`/`RoleName` next
     to the grant tables so a mismatch is visible)

## Proposed fix for scenario 1 (not applied — outside DB-team ownership)

Not implemented anywhere; these are options to hand to whoever owns
`Sp_Get_UserMenuTab_Details.sql` and the tab-provisioning process, for them
to evaluate. No SP, table, or data was changed as part of this
investigation.

- **Option A — relax the join (code fix, single point of change).**
  `Sp_Get_UserMenuTab_Details.sql:28-33` currently requires
  `TBD.Employerid = TUD.EmployerId` exactly. 308 of `TTabDetails`'s 314 rows
  already sit at `Employerid = 0`, which reads as a "global" tab template
  that was presumably meant to apply everywhere — matching the *original*
  commented-out logic at `Sp_Get_UserMenuTab_Details.sql:25-27`, which
  unioned `EmployerID = 0` with `EmployerID = @EmployerId` directly against
  `TTabDetails` (no per-user join at all). Changing the current join's
  predicate to `(TBD.Employerid = TUD.EmployerId OR TBD.Employerid = 0)`
  would let any tenant's per-user grant in `TUserTabDetails` match against
  the global template row when no tenant-specific master row exists —
  fixing all 55+ affected tenants in one change, with no backfill needed.
  Risk: any tenant that has genuinely *custom* tabs at a non-zero
  `Employerid` today (only `Employerid = 10` has any: 5 rows) keeps working
  identically since the tenant-specific match still takes priority in
  practice (both would match, so verify there's no unwanted duplication if
  a `TabId`/`MenuId` pair exists at both `0` and the tenant's own
  `Employerid`).
- **Option B — backfill `TTabDetails` per tenant (data-only, no code
  change).** For every distinct `Employerid` present in
  `TUserTabDetails`/`TRoleTabDetails` but absent from `TTabDetails`, clone
  the `Employerid = 0` template rows with that tenant's `Employerid`. No SP
  change, but it's a one-time migration that must be repeated for every
  newly onboarded tenant unless the tenant-onboarding process is fixed to
  do this automatically — fragile as an ongoing fix.
- **Recommendation:** Option A is the more durable fix (one change, no
  ongoing maintenance) and mirrors what the original commented-out code
  was already trying to do. Option B is a viable stop-gap if a code
  deployment isn't feasible soon, but shouldn't replace the code fix
  long-term.

## Ruled out

- **`TRoleBasePagesAccess`** — keyed oddly by `EmployeeId` rather than
  `RoleID`, which looked promising at first glance. It's only referenced by
  Role Management admin CRUD (`SP_AddRolePageAccess`,
  `SP_UpdateRolePageAccess`, `SP_GetRoleDetailsByRoleName`, etc.), never by
  `sp_GetDynamicMenuItems` or `SP_RRS_GetHasMenuAccessByUser`. Not part of
  the runtime render path — ignore it when diagnosing a visibility issue.
- **Duplicate/stale `TUserEmployee` mappings** — same underlying risk as
  `troubleshooting/authentication/README.md` scenario 5 (no PK on
  `(UserID, EmployeeID)`); `Sp_Get_UserMenuTab_Details.sql:34-35` joins it
  with no dedup guard. Covered there — no separate script needed here, but
  keep it in mind if the resolved `UserID` looks wrong.

## Scripts in this folder

| Script | Type | Scenario(s) |
|---|---|---|
| `diagnose-menu-tab-access.sql` | read-only | 1, 2, 3, 4, 5, 6 |
| `find-users-with-menu-tab-access.sql` | read-only | 1, 2, 3 (reverse direction: given a menu/tab name, lists who has access) |
