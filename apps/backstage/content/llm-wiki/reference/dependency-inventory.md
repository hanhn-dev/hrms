---
sources:
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/ELMAH_LogError.sql
  - HRMS-DATABASE/HRMS/SYNONYMS
  - HRMS-DATABASE/HRMS/TABLES/TEmployee.sql
confidence: medium
last-analyzed: 2026-06-26
---

# Dependency Inventory

External and internal dependencies the database relies on. There is no package
manifest (this is a SQL object repo, not an application), so dependencies are
inferred from the objects themselves.

## Platform

| Dependency | Version | Purpose / evidence |
|---|---|---|
| Microsoft SQL Server | not pinned in source | Host engine. Uses `IDENTITY`, `VARBINARY(MAX)`, `UNIQUEIDENTIFIER newid()`, `FILLFACTOR`, `XML PATH`, `sp_executesql`, `TIME(7)`, `getutcdate()`. `TIME(7)` requires SQL Server 2008+. Exact edition/version not stated — see open questions. |
| T-SQL | n/a | Sole implementation language for logic. |

## Inter-database dependencies (via synonyms)

The core `HRMS_PROD` depends on six sibling databases at runtime through
synonyms (`HRMS/SYNONYMS/*.sql`). See `module-dependency-graph.md` for the full
edge list. These are hard runtime dependencies: a missing target DB breaks the
synonym-referencing procedures.

| Target database | Consumed for |
|---|---|
| `HRM_CL_TIMEPORT` | timesheet objects |
| `Training` | training objects (`TEMAIL_NOTIFICATION`, assignments) |
| `TravelNExpense_Prod` | expense objects (`TExpense`, `TExpense_Payment`) |
| `ResourceAllocation` | allocation objects |
| `HRM_CRBooking_Prod` | room-booking objects |
| `SURVEY` | survey objects |

## Third-party / integration dependencies (inferred from objects)

| Dependency | Evidence | Confidence |
|---|---|---|
| ELMAH error-logging library | `ELMAH_Error` table + `ELMAH_LogError`/`ELMAH_GetErrorXml`/`ELMAH_GetErrorsXml` procs; references `/HRM/Login.aspx` | high — ELMAH is the standard ASP.NET error logger |
| ASP.NET application tier | `/HRM/Login.aspx` path in `ELMAH_LogError.sql`; `SessionID`/`PageName` in `TAuditTrail` | high (caller is .NET web app) |
| SSIS (SQL Server Integration Services) | `*_SSIS_Temp_*` staging tables for tenant data import (`Ecomak_`, `GenXInfo_`, `Brinton`) | high |
| External encryption key/provider | `*_Encrypted VARBINARY(MAX)` columns on `TEmployee` are written by an external key, not by DDL here | medium |
| Timesheet integration partners | `TIntegrationPartner`, `TIntegrationTokenMapping`, `TIntegrationErrorLog` in TIMEPORT | medium — partner identities not in source |
| Geo/IP attendance providers | `TGeoTagging*`, `TGeoTrackingConfig`, `IsIPBasedAttendance` | medium |

## Notable internal helper dependencies

- `Fn_GetHomePageNotificationIdByRequestType` — maps a `RequestType` to a
  home-page notification id (used by the approval engine,
  `SP_ApproveWorkFlowRequest.sql:81`).
- `SP_AddAdminChanges` — shared config-change router called by master-data edit
  procedures.

> No version pinning exists in this repository. Exact SQL Server version,
> ELMAH version, and integration-partner SDKs are open questions — see
> `../assumptions/open-questions.md`.
