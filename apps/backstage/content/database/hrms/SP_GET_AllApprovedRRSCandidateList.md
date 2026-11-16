---
object: SP_GET_AllApprovedRRSCandidateList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GET_AllApprovedRRSCandidateList.sql
last-analyzed: 2026-11-09
---

# SP_GET_AllApprovedRRSCandidateList

## What it does

Lists recruitment candidates notified for joining who are not yet in POBCandidate, for the Notification and Initiation pickers.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | INT |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GET_AllApprovedRRSCandidateList
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

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GET_AllApprovedRRSCandidateList.sql`:

1. Executes `Sp_OpenEncryptionKeys`.
2. Executes `SP_CloseEncryptionKey`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRRSCandidate` | read |
| `dbo.POBCandidate` | read |

## Flow

```mermaid
flowchart TD
  Start["SP_GET_AllApprovedRRSCandidateList"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
