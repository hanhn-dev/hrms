---
object: USP_COB_GetProcessSectionValues
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_COB_GetProcessSectionValues.sql
last-analyzed: 2026-11-16
---

# USP_COB_GetProcessSectionValues

## What it does

Returns staged TCOB_ProcessSectionValues rows for one Import Management request (Values JSON, validity flags, process status columns as stored).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RequestID` | in | Required input |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_COB_GetProcessSectionValues
  Caller->>Main: execute
  Main->>Main: run body against TCOB tables
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App caller: `ClientOnboardingDAL.getProcessSectionValues` from Import Management (`GET /api/clientonboard2/getProcessSectionValues`) and nested from BLL validation / queue handlers.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| *(none)* | — | — | — |

## Steps

1. Select process section value rows for @RequestID joined to the upload request.

2. Return the Values JSON and related status columns for each SectionID.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCOB_ProcessSectionValues` | read or write |
| `dbo.TCOB_TemplateUploadRequest` | read or write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_COB_GetProcessSectionValues] --> Work[Read or write TCOB staging]
  Work --> Done[Return result set]
```
