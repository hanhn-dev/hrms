---
object: USP_UpdatePOBCandidateExpectedDOJ
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_UpdatePOBCandidateExpectedDOJ.sql
last-analyzed: 2026-11-09
---

# USP_UpdatePOBCandidateExpectedDOJ

## What it does

Updates expected date of joining on a POB candidate and writes detail history.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |
| `@POBCandidateID` | in | INT |
| `@ExpectedDateOfJoining` | in | DATETIME |
| `@LoginUserID` | in | INT |
| `@Comment` | in | VARCHAR |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_UpdatePOBCandidateExpectedDOJ
  participant C0 as USP_POBCandidateDetailHistory_SaveUpdate
  participant C1 as SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
  Caller->>Main: execute
  Main->>C0: call
  Main->>C1: call
```

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_POBCandidateDetailHistory_SaveUpdate` | procedure | always when reached | [USP_POBCandidateDetailHistory_SaveUpdate](/docs/database/hrms/USP_POBCandidateDetailHistory_SaveUpdate) |
| `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle` | procedure | always when reached | [SP_CM_GetWorkflowTreeXmlDetailsByPageTitle](/docs/database/hrms/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle) |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_UpdatePOBCandidateExpectedDOJ.sql`:

1. Executes `USP_POBCandidateDetailHistory_SaveUpdate`.
2. Executes `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.POBCandidate` | write |
| `dbo.TRRSCandidate` | write |
| `dbo.TEmailNotification` | write |

## Flow

```mermaid
flowchart TD
  Start["USP_UpdatePOBCandidateExpectedDOJ"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
