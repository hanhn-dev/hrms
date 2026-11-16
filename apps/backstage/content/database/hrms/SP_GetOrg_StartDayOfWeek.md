---
object: SP_GetOrg_StartDayOfWeek
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetOrg_StartDayOfWeek.sql
last-analyzed: 2026-11-16
---

# SP_GetOrg_StartDayOfWeek

## What it does

Returns `StartDayOfWeek` from `TEmployerDetails` for an employer. TimePort uses this (via synonym) so the TimeSheet week grid aligns with the org calendar.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerID` | in | Employer id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetOrg_StartDayOfWeek
  Caller->>Main: execute
  Note over Main: No nested procedure calls
```

## Callers

Nested from `Sp_TS_GetEmpTimeSheetMonthWise` and `Sp_TS_GetEmpTimeSeetAttendanceDetails`. Also Home attendance cards.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| _(none)_ | — | — | — |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetOrg_StartDayOfWeek.sql`:

1. Select StartDayOfWeek from `TEmployerDetails` where EmployerID matches.

## Tables

| Table | Read or write |
|---|---|
| `TEmployerDetails` | read |

## Unresolved calls

None identified beyond the nested objects listed above.

## Flow

```mermaid
flowchart TD
  Start[SP_GetOrg_StartDayOfWeek] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
