---
object: SP_UpdatePOBCandidateStatus
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_UpdatePOBCandidateStatus.sql
last-analyzed: 2026-11-09
---

# SP_UpdatePOBCandidateStatus

## What it does

Updates POBCandidate status and writes a history comment row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |
| `@EmployeeId` | in | INT |
| `@CandidateId` | in | INT |
| `@Comment` | in | VARCHAR |
| `@Status` | in | VARCHAR |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_UpdatePOBCandidateStatus
  participant C0 as USP_POBCandidateDetailHistory_SaveUpdate
  participant C1 as dbo
  participant C2 as SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
  participant C3 as USP_TCandidateMileStoneComments_Save
  Caller->>Main: execute
  Main->>C0: call
  Main->>C1: call
  Main->>C2: call
  Main->>C3: call
```

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_POBCandidateDetailHistory_SaveUpdate` | procedure | always when reached | [USP_POBCandidateDetailHistory_SaveUpdate](/docs/database/hrms/USP_POBCandidateDetailHistory_SaveUpdate) |
| `dbo` | procedure | always when reached | No page yet |
| `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle` | procedure | always when reached | [SP_CM_GetWorkflowTreeXmlDetailsByPageTitle](/docs/database/hrms/SP_CM_GetWorkflowTreeXmlDetailsByPageTitle) |
| `USP_TCandidateMileStoneComments_Save` | procedure | always when reached | No page yet |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_UpdatePOBCandidateStatus.sql`:

1. Executes `USP_POBCandidateDetailHistory_SaveUpdate`.
2. Executes `dbo`.
3. Executes `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle`.
4. Executes `USP_TCandidateMileStoneComments_Save`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.POBCandidate` | write |
| `dbo.POBCandidateHistory` | write |
| `dbo.TEmailNotification` | write |

## Flow

```mermaid
flowchart TD
  Start["SP_UpdatePOBCandidateStatus"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
