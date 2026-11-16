---
object: USP_OTD_GetEligibleSection
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/159568/USP_OTD_GetEligibleSection.sql
last-analyzed: 2026-11-16
---

# USP_OTD_GetEligibleSection

## What it does

Returns active process sections flagged `IsClientDefaultMasterData = 1` for the Setup Data Management section picker. Optionally filters to industry-scoped or Common sections via `@IsIndustryScoped`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@IsIndustryScoped` | in | Null = every eligible section. 0 = Common. 1 = industry-scoped. Default null |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_OTD_GetEligibleSection
  Caller->>Main: execute
  Main-->>Caller: section rows
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App caller: `ClientOnboardingDAL.getEligibleSection`.

## Nested

Calls no other procedures or functions.

## Steps

1. Select SectionID, Section, DisplayOrder, ModuleId, IsIndustryScoped from active `TCOB_ProcessSectionMaster` where `IsClientDefaultMasterData = 1`.

2. When `@IsIndustryScoped` is not null, keep only matching `IsIndustryScoped` rows. Order by DisplayOrder, SectionID.

## Tables

| Table | Read or write |
|---|---|
| `TCOB_ProcessSectionMaster` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_OTD_GetEligibleSection] --> Base[IsClientDefaultMasterData active]
  Base --> Scope{IsIndustryScoped filter}
  Scope -->|null| All[All eligible]
  Scope -->|0 or 1| Filtered[Matching scope]
  All --> Ret[Order and return]
  Filtered --> Ret
```
