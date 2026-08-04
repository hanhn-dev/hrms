---
sources:
  - HRMS-DATABASE/HRMS/SYNONYMS
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ApproveWorkFlowRequest.sql
confidence: low
last-analyzed: 2026-06-26
---

# Deployment Topology

Where and how this runs. The repository contains **no deployment automation**
(no pipeline, IaC, Dockerfile, or environment config), so this is reconstructed
from naming evidence and is low-confidence.

## Inferred topology

- **Seven SQL Server databases on (at least) one instance.** Cross-database
  synonyms with three-part names (`[Db].[dbo].[Object]`) work within a single
  SQL Server instance (or linked servers), which strongly implies the seven
  databases are co-located:
  - `HRMS_PROD` (core), `HRM_CL_TIMEPORT`, `Training`, `TravelNExpense_Prod`,
    `ResourceAllocation`, `HRM_CRBooking_Prod`, `SURVEY`.
- **Environments.** Naming hints at PROD plus non-prod: `Training_Dev` synonym
  target, `TLOOKUP_CL_UAT`, and pervasive `*_DP` table variants (a parallel
  dev/data-prep set). The `*_PROD` suffix on most DB names marks production.
- **Application tier** (external to this repo): an ASP.NET web app + likely a
  mobile app (recent "Mobile Management" module, `TMobileUser`/`TMobileTracking`,
  `LatestMobileAppVersion` on `TUsers`).

## Time zone

Some defaults hardcode IST (UTC+5:30) — e.g.
`DATEADD(MINUTE, 330, GETUTCDATE())` on
`TDeviceInvalidLoginAttemptDetails.LoginAttemptedAt` — while per-tenant time zone
is configurable via `TEmployerDetails.TimeZone`/`TimeZoneId`. Storage favors UTC
columns (`*UtcTime`, `getutcdate()`).

## Unknown (not in repo)

Hosting (on-prem vs Azure SQL), regions, HA/DR, scaling units, ingress, backup
schedule, and how releases are applied to each database. See
`../assumptions/open-questions.md` and `../workflows/release-process.md`.

<!-- TODO: needs input — deployment/runtime topology is defined outside this repo. -->
