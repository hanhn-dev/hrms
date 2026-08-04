---
sources:
  - HRMS-DATABASE/HRMS/TABLES
  - HRMS-DATABASE/HRMS/STOREPROCEDURE
  - HRMS-DATABASE/HRMS/FUNCTIONS
confidence: high
last-analyzed: 2026-06-26
---

# SQL Naming Conventions

Observed naming conventions across the HRMS object scripts. These are the de
facto rules; deviations exist (this is a long-lived, multi-author codebase).

## Tables

- **Prefix `T`** for application tables: `TEmployee`, `TLeaveRequest`,
  `TWorkflowManagement`. Some satellite tables use ALL-CAPS with underscores:
  `TRESOURCEALLOCATION`, `TEXPENSE_TRAVEL`, `TCONFBOOKINGS`, `TTRAVEL_REQUEST`.
- **Master/registry tables** often suffix `Master`: `TLeaveTypeMaster`,
  `TShiftGroupMaster`, `TActivityMaster`.
- **PascalCase columns**, but **casing is inconsistent** — e.g. `TRoles` mixes
  `RoleName`/`IsDefault` (Pascal) with `createdby`/`createDate` (lower). Don't
  assume a single casing.
- **Booleans**: `Is*`/`Allow*`/`Has*` as `BIT` or `CHAR(1)` (`'Y'`/`'N'`).
- **Keys**: PK named `<Entity>Id` (e.g. `EmployeeId`, `WorkflowId`); some are
  `TransId`/`RequestTransid`/`LeaveTransactionId` for transaction tables.
- **Audit columns**: `CreatedBy`/`CreatedDate`, `UpdatedBy`/`UpdatedDate`
  (+ UTC mirrors `*UtcTime`).
- **Tenant column**: `Employerid` (note the lowercase `id`).

## Suffix conventions (real artifacts in the tree)

| Suffix | Meaning |
|---|---|
| `_History` | shadow table of prior versions |
| `_bkp<date>` / `_BKP` | ad-hoc backup before a change (e.g. `_bkp72722`) |
| `_<numeric>` | per-tenant/PBI snapshot (e.g. `TAttendance_3889`) |
| `_DP` | parallel "data prep"/dev set |
| `_<TenantName>` | tenant-specific copy (`_Brinton`, `_Nyati`, `_Sunfire`, `_Oswal`) |
| `*_SSIS_Temp_*` | SSIS import staging |
| `_V1`/`_V2`/`_V3` | versioned procedure variants |

> These suffixed objects are **not** the live object for the base name. Always
> target the unsuffixed name unless you specifically need a variant.

## Stored procedures

- **Prefixes** (most → least common): `SP_`, `Sp_`, `HRMS_SP_`, `USP_`/`usp`/
  `uspP`. Casing is mixed.
- **Area + verb**: `SP_<Area><Verb>` or `SP_Admin<Area>_<Verb>`, e.g.
  `SP_AdminLM_GetLeaveBal`, `Sp_AdminPMS_GetAllSalaryRecPercentageMapping`.
- **Verbs**: `Get`, `Ins`/`Insert`, `Upd`/`Update`, `Del`/`Delete`, `Add`,
  `Save`.
- **Reporting**: `OV_Rule_<Area>_<Slice>_{Card|Detail|Summary}`.
- **Cross-DB wrappers**: synonym-backed procs may prefix `Syn_`.

## Functions

- Scalar/TVF prefix `Fn_` or `TFN_`: `Fn_GetSpecificWorkingDay`,
  `TFN_LatestProjectConfiguration`.

## Synonyms

- Local name matches the remote object; cross-module ones append the module:
  `TEMAIL_NOTIFICATION_TRAINING`, `TEMAIL_NOTIFICATION_SURVEY`.

## Indexes / constraints

- PKs created `WITH (FILLFACTOR = 80|90)`.
- NC indexes: `IX_<Table>_<Cols>[_<hash>]` (auto-generated hash suffix common on
  `TRequestWorkflows`).
- Defaults named `DF_<Table>_<Col>` (when named at all; many are auto-named).
