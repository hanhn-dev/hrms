---
object: USP_COB_GetTemplateMappedFields
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_COB_GetTemplateMappedFields.sql
last-analyzed: 2026-11-16
---

# USP_COB_GetTemplateMappedFields

## What it does

Lists field-mapping rows for one Import Management request sheet. Reads TCOB_TemplateMappingFields for the request / sheet (scoped by template and employer via the upload request).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TemplateID` | in | Required input |
| `@EmployerID` | in | Required input |
| `@RequestID` | in | Required input |
| `@SheetID` | in | Optional; default NULL |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_COB_GetTemplateMappedFields
  Caller->>Main: execute
  Main->>Main: run body against TCOB tables
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App caller: `ClientOnboardingDAL.getTemplateMappedFields` from Import Management (`GET /api/clientonboard2/getTemplateMappedFields`).

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| *(none)* | — | — | — |

## Steps

1. Join TCOB_TemplateMappingFields to the upload request, sheet details, and template master.

2. Filter by @TemplateID, @EmployerID, @RequestID, and @SheetID.

3. Return mapping field rows including FieldInfo JSON.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCOB_TemplateMappingFields` | read or write |
| `dbo.TCOB_TemplateUploadRequest` | read or write |
| `dbo.TCOB_TemplateSheetDetails` | read or write |
| `dbo.TCOB_TemplateMaster` | read or write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_COB_GetTemplateMappedFields] --> Work[Read or write TCOB staging]
  Work --> Done[Return result set]
```
