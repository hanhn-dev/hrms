---
object: Sp_TS_GetProjectConfigurationDet
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetProjectConfigurationDet.sql
last-analyzed: 2026-11-16
---

# Sp_TS_GetProjectConfigurationDet

## What it does

Returns the Projects grid for an employer, joining client and project names and filtering clients visible to the employee through UFN_GetClientbyEmployeeBU.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id |
| `@pEmployeeID` | in | Login employee id used for client BU filter |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TS_GetProjectConfigurationDet
  participant N_UFN_GetClientbyEmployeeBU as UFN_GetClientbyEmployeeBU
  Caller->>Main: execute
  Main->>N_UFN_GetClientbyEmployeeBU: execute
```

## Callers

Application only. timeportDAL.GetProjectConfigurationDet.

## Nested

| Object | Kind | Page |
|---|---|---|
| `UFN_GetClientbyEmployeeBU` | function | No page yet |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/Sp_TS_GetProjectConfigurationDet.sql`:

1. SELECT project configuration rows for the employer.
2. Resolve project and client names from TProject and TClient.
3. Resolve LOB and cost center labels from TTSLOOKUP.
4. INNER JOIN UFN_GetClientbyEmployeeBU to limit clients.

## Tables

| Table | Read or write |
|---|---|
| `TTSProjectConfiguration` | read |
| `TProject` | read |
| `TClient` | read |
| `TTSLOOKUP` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[Sp_TS_GetProjectConfigurationDet] --> S0
  S0["SELECT project configuration rows for the employer."]
  S1["Resolve project and client names from TProject and TClient."]
  S2["Resolve LOB and cost center labels from TTSLOOKUP."]
  S3["INNER JOIN UFN_GetClientbyEmployeeBU to limit clients."]
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> Done[Return]
```
