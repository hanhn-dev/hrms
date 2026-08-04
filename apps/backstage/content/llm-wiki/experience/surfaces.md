---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TModulePages.sql
  - HRMS-DATABASE/HRMS/TABLES/TRolePagesMapping.sql
  - HRMS-DATABASE/HRMS/TABLES/THrmsModules.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/ELMAH_LogError.sql
confidence: low
last-analyzed: 2026-06-26
---

# Surfaces

The UI/API surfaces of the system. The front end is **not in this repository**;
surfaces are inferred from page/module metadata the database holds.

## Page model (what the DB knows about the UI)

- **`TModulePages`** is the catalog of application pages (`ModulePageName`), and
  it is the join key for both access control and workflow mapping
  (`TWorkflowManagement.MappedPages` references a `ModulePageId`).
- **Access is page- and tab-granular**: `TRolePagesMapping` /
  `TRoleBasePagesAccess` (per role), `TUSerPagesMapping` (per user),
  `TRoleTabDetails`/`TUserTabDetails` (tabs within a page).
- **`THrmsModules`** groups pages into feature modules and orders them
  (`DisplayOrder`), with `IsNotificationModule` flagging notification surfaces.

## Known surface families (by feature module)

Derived from the module/feature areas in the schema and SP prefixes:

- **Self-service**: leave, WFH, attendance regularization, comp-off, timesheet,
  expense/travel, training, surveys, business cards, resignation.
- **Approvals/Notifications**: a home-page notifications surface
  (`Fn_GetHomePageNotificationIdByRequestType`) where managers act on requests.
- **Admin/config**: leave-type setup, workflow setup, role & page access,
  org taxonomy, employer configuration (the feature flags), PMS/CMS setup.
- **Reports**: dashboard cards/details/summaries via `OV_Rule_*` procedures.
- **Mobile**: a mobile app surface (recent Mobile Management module;
  `TUsers.LatestMobileAppVersion`).

## API surface

The callable surface is the stored procedures (`../reference/service-apis.md`).
A login page exists at `/HRM/Login.aspx` (referenced in `ELMAH_LogError.sql`),
confirming an ASP.NET web surface.

> Screen inventories, control-level detail, and field/limits live in the app tier
> (not in this repo). This page maps only what the database's page/role metadata
> reveals. See `../assumptions/open-questions.md`.

<!-- TODO: needs input — concrete screen list and UI controls are defined in the
external application. -->
