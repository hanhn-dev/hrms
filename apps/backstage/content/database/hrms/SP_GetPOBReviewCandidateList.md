---
object: SP_GetPOBReviewCandidateList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetPOBReviewCandidateList.sql
last-analyzed: 2026-11-09
---

# SP_GetPOBReviewCandidateList

## What it does

Lists candidates ready for HR review on the Review tab.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | INT |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetPOBReviewCandidateList
  participant C0 as Sp_OpenEncryptionKeys
  participant C1 as SP_CloseEncryptionKey
  participant C2 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>C0: call
  Main->>C1: call
  Main->>C2: call
```

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | always when reached | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | always when reached | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `Fn_GetEmployeeName` | function | always when reached | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetPOBReviewCandidateList.sql`:

1. Executes `Sp_OpenEncryptionKeys`.
2. Executes `SP_CloseEncryptionKey`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEMAILCOMMUNICATION` | read |
| `dbo.POBCandidate` | read |
| `dbo.POBCandidateTemplate` | read |
| `dbo.POBCandidateLogin` | read |
| `dbo.TRRSCandidate` | read |

## Flow

```mermaid
flowchart TD
  Start["SP_GetPOBReviewCandidateList"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
