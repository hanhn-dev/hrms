---
object: SP_GetEmployerSubmitMSGStatus
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_GetEmployerSubmitMSGStatus.sql
last-analyzed: 2026-11-16
---

# SP_GetEmployerSubmitMSGStatus

## What it does

Returns whether the employer should show the allocated-hours message on timesheet submit (`AllocatedHoursMSGFlag`, default 1 when null).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetEmployerSubmitMSGStatus
  Caller->>Main: execute
  Note over Main: No nested procedure calls
```

## Callers

Application caller: TimePort API `GetEmployerSubmitMSGStatus` for TimePort → TimeSheet submit UX.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| _(none)_ | — | — | — |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_GetEmployerSubmitMSGStatus.sql`:

1. Select EmployerID and ISNULL(AllocatedHoursMSGFlag, 1) from `TTSSubmitMSGConfigStatus`.

## Tables

| Table | Read or write |
|---|---|
| `TTSSubmitMSGConfigStatus` | read |

## Unresolved calls

None identified beyond the nested objects listed above.

## Flow

```mermaid
flowchart TD
  Start[SP_GetEmployerSubmitMSGStatus] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
