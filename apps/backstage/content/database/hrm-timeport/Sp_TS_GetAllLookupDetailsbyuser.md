---
object: Sp_TS_GetAllLookupDetailsbyuser
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetAllLookupDetailsbyuser.sql
last-analyzed: 2026-11-16
---

# Sp_TS_GetAllLookupDetailsbyuser

## What it does

Returns project-scoped lookup values (SDLC, work item, work product, and related mappings) effective as of a date, using temporal `TTSLookUpMapping`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id |
| `@ProjectConfigId` | in | Project configuration id (UI may send as Projectid) |
| `@EffectiveUntil` | in | Effective date for temporal mapping |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TS_GetAllLookupDetailsbyuser
  Caller->>Main: execute
  Note over Main: No nested procedure calls
```

## Callers

Application caller: TimePort API `GetAllLookupDetailsbyuser` for TimePort → TimeSheet row dropdowns.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| _(none)_ | — | — | — |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetAllLookupDetailsbyuser.sql`:

1. Materialise temporal `#LookUpMapping` for the ProjectConfigId.
2. Compute deleted-on dates and return active lookup details for the effective date.

## Tables

| Table | Read or write |
|---|---|
| `TTSLookUpMapping` | read |
| `TTSLOOKUP` | read |

## Unresolved calls

None identified beyond the nested objects listed above.

## Flow

```mermaid
flowchart TD
  Start[Sp_TS_GetAllLookupDetailsbyuser] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
