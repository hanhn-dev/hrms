# Access Right Management troubleshooting

Scripts that do the same live-table work as
`HRMS.Web/HRM/Settings/RoleManagement.aspx` (Access Right Management)
without opening the UI.

They write **live tables immediately**. They do **not** call
`SP_AdminRoleM_*` (those procedures replace the entire page/tab list and,
when a workflow is mapped, queue `TAdminChangesApprovals` instead of
writing). Run `diagnose-access-rights.sql` first.

**Layout:** one folder, kebab-case scripts (same idea as
`troubleshooting/authentication/`). Per-employee “why can’t they see this
menu?” stays under [`../menu/`](../menu/README.md).

## UI tab → script

| UI tab / button | Script | Type |
| --- | --- | --- |
| (any) inspect current grants | `diagnose-access-rights.sql` | read-only |
| Setup Roles → Submit (new) / clone an existing role | `create-or-clone-role.sql` | write |
| Setup Roles → Edit → Update | `update-role.sql` | write |
| Setup Roles → Delete | `delete-role.sql` | write |
| Setup Roles → Access To Pages (additive) | `grant-or-revoke-role-menus.sql` | write |
| Users → Submit | `assign-role-to-users.sql` | write |
| Additional Users Permissions → Submit | `grant-or-revoke-user-permissions.sql` | write |
| Employee Summary Permissions → Submit | `set-employee-summary-permissions.sql` | write |
| Dynamic Menu → add/activate one item | `add-employer-menu-and-sync-xml.sql` | write |

## Data model (do not mix domains)

| Domain | Header | Children | This folder? |
| --- | --- | --- | --- |
| Access Right Management | `TRoles` | `TRolePagesMapping`, `TRoleTabDetails`, `TUSerPagesMapping`, `TUserTabDetails`, `TRollWisePageAccess` | Yes |
| Login assignment | `TUsers.RoleID` | `TUsers.IsGlobalAccess`, `ReportingType`, `EmployerIds` | Yes |
| Dynamic menu | `tMenuDetails`, `TMenuHierarchy` | `TDynamicMenuHierarchy` (admin-tree XML cache) | Yes |
| Workflow Group | `TRoleManagement` | `tRoleLocationMapping`, `tRoleBusinessUnitMapping` | **No** |
| Job-title dropdown | `TEmployeeRoleMaster` | — | **No** |

`TRolePagesMapping.PageId` and `TUSerPagesMapping.PageId` are
`tMenuDetails.MenuId`, **not** `TModulePages.ModulePageId`.

Access-role Location/BU are comma strings on every page-mapping row for
that role/user (`LocationIds` / `BusinessUnitIds`). They are not
`tRoleLocationMapping`.

## Runtime gates

- **Left menu** (`sp_GetDynamicMenuItems`): a `MenuId` shows if the
  user’s role has `TRolePagesMapping` **or** the user has
  `TUSerPagesMapping`, with exact `Employerid` and
  `tMenuDetails.ISActive = 1`.
- **In-page tabs** (`Sp_Get_UserMenuTab_Details`): **`TUserTabDetails`
  only**. `TRoleTabDetails` is admin-UI state. `TTabDetails` is often
  missing outside employers `0`, `1`, and `10` — grants then return zero
  tabs. See [`../menu/employee-missing-menu-or-tab/`](../menu/employee-missing-menu-or-tab/README.md).
- **Sidebar cache:** `Session["HRMS_MENU"]`. Target users must log out
  and back in after a grant.

## Footguns

1. **Never** `EXEC SP_AdminRoleM_InsRolePageMapping` /
   `SP_InsertRolePageMapping` / `SP_AdminRoleM_InsUserPageMap` to grant
   one menu. Those **replace** the whole list.
2. **Never** `EXEC sp_InsertDynamicMenuHierarchy` /
   `Sp_AdminRoleM_InsDynamicMenuHierarchy`. Those **wipe** the employer’s
   entire menu (`tMenuDetails`, `TMenuHierarchy`, `TDynamicMenuHierarchy`).
3. **ReportingType** on `TRoles` / `TUsers` is the **RoleID** of the
   tenant role named `Employee`, `Manager`, or `Administrator` — not
   `1` / `3` / `4`. The UI builds this in
   `RoleManagement.aspx.cs` `getReportingType()`.
4. **RoleType** values: `RecruitmentAdmin`, `Administrator`, `HR`,
   `Employee`, `Manager`.
5. **UserID ≠ EmployeeId.** Resolve through `TUserEmployee`.
6. **MenuId 617** (Recruitment): the UI SP also calls
   `USP_InsertRecruitmentClaimIfNotExistForRecruiter`. These scripts do
   not. Grant 617, then handle recruiter claim separately if needed.
7. These scripts **skip admin-change workflow**. Check pending ARM
   requests in `diagnose-access-rights.sql` so you do not fight a queued
   approval.
8. Default roles (`TRoles.IsDefault = 1`) cannot be deleted; the UI also
   locks their name / description / reporting type on edit.

## How to run a write script

1. Run `diagnose-access-rights.sql` for the employer (and role / employee).
2. Set the variables at the top of the write script.
3. Run the whole batch. Review the preview result sets.
4. Uncomment `COMMIT TRANSACTION` (or keep `ROLLBACK TRANSACTION`) after
   you confirm the preview.
5. Ask affected users to log out and back in.
