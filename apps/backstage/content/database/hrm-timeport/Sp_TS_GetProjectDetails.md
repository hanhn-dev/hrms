---
object: Sp_TS_GetProjectDetails
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetProjectDetails.sql
last-analyzed: 2026-11-16
---

# Sp_TS_GetProjectDetails

## What it does

Returns projects available for TimePort project-configuration dropdowns for an employer, employee, and optional client.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id |
| `@pEmployeeid` | in | Employee id |
| `@ClientId` | in | Optional client filter |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TS_GetProjectDetails
  Caller->>Main: execute
```

## Callers

Application only. timeportDAL.GetProjectDetails from Setup Master Projects.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetProjectDetails.sql`:

1. Read project rows for the employer and employee context.
2. Optionally filter by client.
3. Return the project list to the caller.

## Tables

| Table | Read or write |
|---|---|
| `TProject` | read |
| `TClient` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[Sp_TS_GetProjectDetails] --> S0
  S0["Read project rows for the employer and employee context."]
  S1["Optionally filter by client."]
  S2["Return the project list to the caller."]
  S0 --> S1
  S1 --> S2
  S2 --> Done[Return]
```
