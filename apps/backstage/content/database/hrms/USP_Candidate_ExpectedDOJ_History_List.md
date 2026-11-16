---
object: USP_Candidate_ExpectedDOJ_History_List
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_Candidate_ExpectedDOJ_History_List.sql
last-analyzed: 2026-11-09
---

# USP_Candidate_ExpectedDOJ_History_List

## What it does

Lists expected-DOJ change history for a POB candidate when CalledFrom is PreOnBoarding.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@POBCandidateID` | in | INT |
| `@EmployerID` | in | INT |
| `@CalledFrom` | in | VARCHAR |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_Candidate_ExpectedDOJ_History_List
  participant C0 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>C0: call
```

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | always when reached | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_Candidate_ExpectedDOJ_History_List.sql`:

1. See script body for ordered statements.

## Tables

| Table | Read or write |
|---|---|
| `dbo.POBCandidateDetailHistory` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TOrgHierarchyDetails` | read |
| `dbo.TTitle` | read |
| `dbo.TCandidateMileStoneComments` | read |
| `dbo.TRRSCandidate` | read |

## Flow

```mermaid
flowchart TD
  Start["USP_Candidate_ExpectedDOJ_History_List"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
