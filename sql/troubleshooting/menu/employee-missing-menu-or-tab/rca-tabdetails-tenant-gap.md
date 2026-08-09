# RCA: Every employee at 55+ tenants gets zero tabs, regardless of grants

| | |
| --- | --- |
| **Status** | Root cause confirmed against live data. **No fix applied yet — outside DB-team ownership.** |
| **Affected objects** | `Sp_Get_UserMenuTab_Details.sql`, `TTabDetails`, `TUserTabDetails` |
| **Symptom** | An employee is missing a tab within a page (e.g. an "Approval" tab) that a peer with the "same" role can see. Affects every employee at the same tenant, not just one. |
| **Verified against** | `HRM-CL-Prod`, 2026-08-09 |
| **Related scripts** | `diagnose-menu-tab-access.sql` (result set 2), `find-users-with-menu-tab-access.sql` (this folder) |

## Summary

`Sp_Get_UserMenuTab_Details.sql:24-38` — the actual runtime tab-fetch — reads
**only** `TUserTabDetails` (the per-user grant table, joined through
`TUserEmployee`), INNER JOINed to the `TTabDetails` master catalog on
`TBD.Employerid = TUD.EmployerId` (exact match). There is **no fallback to
`TRoleTabDetails`** at runtime.

Confirmed on `HRM-CL-Prod`: `TTabDetails` (the tab master catalog) has only
314 rows total, and only `Employerid` 0 (308 rows), 10 (5 rows), and 1 (1
row) — no other tenant has ever had a tab-master row. Meanwhile
`TUserTabDetails` (per-user tab grants) has real, populated rows for **55+
other tenants** (`Employerid` 11 up to at least 232 seen in a 5k sample).

**Because of the exact-`Employerid`-match INNER JOIN, every employee at
every tenant outside `{0, 1, 10}` gets zero tabs back from this procedure,
no matter what their role or user grants say.** This is a tenant-wide
master-data/code gap, not a per-employee provisioning issue — it likely
explains most "missing tab" support reports outright.

Left-menu item visibility is a *separate* mechanism
(`sp_GetDynamicMenuItems.sql`, role/user grants against
`TMenuHierarchy`/`tMenuDetails`) and is genuinely tenant-scoped and working
correctly — confirmed unaffected for the one tenant (232) tested live.

A role-fallback UNION for tabs exists but is commented out in the sibling
admin proc `Sp_GetTabUserDetails.sql:24-43` — written once, then disabled,
not simply never built.

## Confirmed against the deployed procedure

The *deployed* `Sp_Get_UserMenuTab_Details` matches the checked-in repo file
byte-for-byte (no drift), verified via `get_stored_procedure_definition`.

## Proposed fix (not applied — outside DB-team ownership)

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

## How to verify on another tenant

Run `diagnose-menu-tab-access.sql` with `@EmployeeId` (or
`@EmploymentNumber`) set to any employee at the tenant in question — result
set 2 ("Tab master tenant check") shows `TabMasterRowsForThisTenant` next to
`UserTabGrantRowsForThisTenant`; if the former is 0 while the latter is
greater than 0, this gap is confirmed for that tenant too.
