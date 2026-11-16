---
object: USP_OTD_ProcessDefaultMasterData
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/159568/USP_OTD_ProcessDefaultMasterData.sql
last-analyzed: 2026-11-06
---

# USP_OTD_ProcessDefaultMasterData

## What it does

Seeds default master data for one employer's industry and for industry-independent sections. A null industry id is read from TEmployerDetails. Sections whose target table already holds the defaults are skipped. Each section that still needs rows is sent to USP_COB_MasterProcessor with source OTD. The run is logged on TOTD_ProcessLog. Add Organization calls it with Silent 1, so it returns no grids.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer to seed |
| `@IndustryTypeId` | in | Industry. Null reads TEmployerDetails.IndustryTypeId |
| `@ModuleIds` | in | Section module filter. Null means all sections |
| `@Silent` | in | 1 returns no result sets. Default 0. Add Organization passes 1 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_OTD_ProcessDefaultMasterData
  participant Proc as USP_COB_MasterProcessor
  Caller->>Main: execute
  loop each section
    Main->>Proc: when the section is not skipped
  end
```

## Callers

Procedures and functions that call this object.

| Object | Kind | Page |
|---|---|---|
| `USP_OTD_ApplyDefaultsForEmployer` | procedure | [USP_OTD_ApplyDefaultsForEmployer](/docs/database/hrms/USP_OTD_ApplyDefaultsForEmployer) |

## Nested

| Object | Kind | When | Page |
|---|---|---|
| `USP_COB_MasterProcessor` | procedure | a section still has default rows to insert | No page yet |

## Steps

1. Resolve the industry from the parameter or from TEmployerDetails. Select the sections to process for that industry and for a null industry, optionally filtered by @ModuleIds.

2. For each section, build a comparison against the target table. Skip the section when every default record is already present, or when the table-level row count is already greater than zero and the per-record comparison was not available.

3. Otherwise execute USP_COB_MasterProcessor with the section batch, a null import session, logged-in employee -1, and source OTD.

4. Insert the run into TOTD_ProcessLog, including skipped sections as processed with a Skipped comment.

5. When @Silent is 0, return the detail and summary grids. Silent 1 returns nothing.

## Tables

| Table | Read or write |
|---|---|
| `TEmployerDetails` | read |
| `TCOB_ProcessSectionMaster` | read |
| `TCOB_ProcessSectionMaster_Fields` | read |
| `TOTD_ProcessLog` | write |

## Unresolved calls

The skip check builds `@CheckSql` and runs it with `sys.sp_executesql`. The target table name comes from section configuration (`@TargetSchema`, `@TargetTable`, `@EmployerColumn`). This page does not guess which table that string names.

## Flow

```mermaid
flowchart TD
  Start[USP_OTD_ProcessDefaultMasterData] --> Ind[Resolve industry]
  Ind --> Sec[Each configured section]
  Sec --> Skip{Defaults already present}
  Skip -->|yes| Log[Log skipped]
  Skip -->|no| Proc[USP_COB_MasterProcessor]
  Proc --> Log
  Log --> Silent{Silent is 1}
  Silent -->|yes| None[Return nothing]
  Silent -->|no| Grid[Return detail and summary]
```
