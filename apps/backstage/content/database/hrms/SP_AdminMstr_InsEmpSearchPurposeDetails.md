---
object: SP_AdminMstr_InsEmpSearchPurposeDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminMstr_InsEmpSearchPurposeDetails.sql
last-analyzed: 2026-11-09
---

# SP_AdminMstr_InsEmpSearchPurposeDetails

## What it does

Inserts one classic Search Employee “search purpose” audit row linking who searched, who was returned, and which purpose (or free text) was chosen when that feature flag is enabled.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@SearchedBy` | in | Logged-in employee who ran the search |
| `@SearchedFor` | in | Employee id from the result row |
| `@SearchPurposeId` | in | Purpose master id when selected |
| `@SearchPurposeText` | in | Free-text purpose when applicable |
| `@EmployerID` | in | Employer of the search session |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminMstr_InsEmpSearchPurposeDetails
  participant DB as Database
  Caller->>Main: execute per result row
  Main->>DB: insert purpose detail row
```

## Callers

Application caller: classic `SearchEmployee.aspx.cs` `insertEmployeeSearchPurposeData` → `SetupMasterDAL.InsertEmployeeSearchPurposeDetails`.

## Nested

None.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminMstr_InsEmpSearchPurposeDetails.sql`.
2. Insert the searched-by / searched-for / purpose payload into the search-purpose details table.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployeeSearchPurposeDetails` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminMstr_InsEmpSearchPurposeDetails] --> Ins[Insert purpose detail]
  Ins --> EndNode[Return]
```
