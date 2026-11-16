---
object: Sp_TS_InsertUpdate_TLookup
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_InsertUpdate_TLookup.sql
last-analyzed: 2026-11-16
---

# Sp_TS_InsertUpdate_TLookup

## What it does

Inserts or updates TimePort reference lookup values and project mappings. When project configs are supplied, calls USP_IsProjectConfigInUse before mapping changes.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LookupID` | in | Existing lookup id or 0 for insert |
| `@LookupName` | in | Lookup name |
| `@LookupDesc` | in | Lookup description |
| `@LookupParentId` | in | Parent lookup id |
| `@SubParentId` | in | Sub-parent id |
| `@pEmployerid` | in | Employer id |
| `@Isdeleted` | in | Deleted flag |
| `@IsTimeOff` | in | Time-off flag |
| `@IsHoliday` | in | Holiday flag |
| `@ProjectConfigIds` | in | Comma-separated project config ids |
| `@IsBillable` | in | Billable flag |
| `@LoginUserID` | in | Acting employee id |
| `@EffectiveUntil` | in | Effective date |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TS_InsertUpdate_TLookup
  participant N_USP_IsProjectConfigInUse as USP_IsProjectConfigInUse
  Caller->>Main: execute
  Main->>N_USP_IsProjectConfigInUse: execute
```

## Callers

Application only. timeportDAL.InsertUpdateLookup.

## Nested

| Object | Kind | Page |
|---|---|---|
| `USP_IsProjectConfigInUse` | procedure | [USP_IsProjectConfigInUse](/docs/database/hrm-timeport/USP_IsProjectConfigInUse) |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_InsertUpdate_TLookup.sql`:

1. When no project configs, insert a new TTSLOOKUP row.
2. When project configs are present, guard with USP_IsProjectConfigInUse flag ManageReferenceData.
3. Upsert TTSLOOKUP and TTSLookUpMapping for the selected configs.

## Tables

| Table | Read or write |
|---|---|
| `TTSLOOKUP` | write |
| `TTSLookUpMapping` | write |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[Sp_TS_InsertUpdate_TLookup] --> S0
  S0["When no project configs, insert a new TTSLOOKUP row."]
  S1["When project configs are present, guard with USP_IsProjectCo"]
  S2["Upsert TTSLOOKUP and TTSLookUpMapping for the selected confi"]
  S0 --> S1
  S1 --> S2
  S2 --> Done[Return]
```
