---
object: USP_License_ModuleUsage_Insights
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_License_ModuleUsage_Insights.sql
last-analyzed: 2026-11-09
---

# USP_License_ModuleUsage_Insights

## What it does

Powers the Module Usage Analytics grid on the Customer License Dashboard with one AI insight per organisation/module row. Scans `TActivityLog` for the selected employers over the current range plus an equal-length baseline, classifies each module as INACTIVE / DROP / SPIKE / LOW_ENGAGEMENT / STABLE using thresholds from `TLicenseInsightSetting`, and returns two result sets: the grid rows and a summary count strip.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@FromDate` | in | Inclusive range start |
| `@ToDate` | in | Inclusive range end |
| `@EmployerIDs` | in | Comma-separated employer ids |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_License_ModuleUsage_Insights
  Caller->>Main: execute
  Main->>Main: read settings classify activity
```

Calls no other procedures or functions.

## Callers

| Object | Kind | Page |
|---|---|---|
| `ModuleUsageInsightsDAL.list` | app | [Customer License Dashboard](/docs/guides/customer-license/customer-license-dashboard) |

## Nested

None.

## Steps

1. Reject inverted date ranges.
2. Split `@EmployerIDs` into `#Emp`; exit quietly when empty.
3. Load usage thresholds from `TLicenseInsightSetting`.
4. Aggregate current and baseline visits/users from `TActivityLog` / `TActivityLogTypes`.
5. Classify rows with precedence INACTIVE → DROP → SPIKE → LOW_ENGAGEMENT → STABLE.
6. Return grid result set, then summary counts.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TLicenseInsightSetting` | read |
| `dbo.TActivityLog` | read |
| `dbo.TActivityLogTypes` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TEmployerDetails` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["USP_License_ModuleUsage_Insights"] --> Guard["Validate dates and employer list"]
  Guard --> Thresh["Load TLicenseInsightSetting"]
  Thresh --> Agg["Aggregate TActivityLog"]
  Agg --> Class["Classify insight codes"]
  Class --> Out["Grid + summary result sets"]
```
