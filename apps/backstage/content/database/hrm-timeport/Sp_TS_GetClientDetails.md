---
object: Sp_TS_GetClientDetails
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetClientDetails.sql
last-analyzed: 2026-11-16
---

# Sp_TS_GetClientDetails

## What it does

Returns clients available to the employee for TimePort master screens.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id |
| `@pEmployeeid` | in | Employee id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TS_GetClientDetails
  Caller->>Main: execute
```

## Callers

Application only. timeportDAL.GetClientDetails.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetClientDetails.sql`:

1. Read client rows for the employer and employee context.
2. Return the client list.

## Tables

| Table | Read or write |
|---|---|
| `TClient` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[Sp_TS_GetClientDetails] --> S0
  S0["Read client rows for the employer and employee context."]
  S1["Return the client list."]
  S0 --> S1
  S1 --> Done[Return]
```
