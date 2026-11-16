---
object: USP_TS_TTSLookup_Select
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_TS_TTSLookup_Select.sql
last-analyzed: 2026-11-16
---

# USP_TS_TTSLookup_Select

## What it does

Searches Manage Reference Data rows by employer, optional clients, project configs, and reference types, joining lookup mappings to project and client names.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id |
| `@ClientIds` | in | Optional comma-separated client ids |
| `@ProjectConfigIds` | in | Optional project config ids |
| `@ReferenceTypeIds` | in | Optional reference type ids |
| `@EmployeeID` | in | Login employee id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TS_TTSLookup_Select
  Caller->>Main: execute
```

## Callers

Application only. timeportDAL.GetLookupDetailsSearch.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_TS_TTSLookup_Select.sql`:

1. SELECT distinct TTSLOOKUP rows for the employer.
2. OUTER APPLY mappings via TTSLookUpMapping and TTSProjectConfiguration.
3. Resolve project and client names from TProject and TClient.
4. Apply optional client, project, and type filters.

## Tables

| Table | Read or write |
|---|---|
| `TTSLOOKUP` | read |
| `TTSLookUpMapping` | read |
| `TTSProjectConfiguration` | read |
| `TProject` | read |
| `TClient` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[USP_TS_TTSLookup_Select] --> S0
  S0["SELECT distinct TTSLOOKUP rows for the employer."]
  S1["OUTER APPLY mappings via TTSLookUpMapping and TTSProjectConf"]
  S2["Resolve project and client names from TProject and TClient."]
  S3["Apply optional client, project, and type filters."]
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> Done[Return]
```
