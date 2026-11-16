---
object: USP_POBCandidateDetailHistory_SaveUpdate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_POBCandidateDetailHistory_SaveUpdate.sql
last-analyzed: 2026-11-09
---

# USP_POBCandidateDetailHistory_SaveUpdate

## What it does

Writes a POBCandidateDetailHistory row for field-level changes during initiation or DOJ updates.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@POBCandidateID` | in | INT |
| `@SourceType` | in | VARCHAR |

## Call sequence

Calls no other procedures or functions.

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

Calls no other procedures or functions.

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_POBCandidateDetailHistory_SaveUpdate.sql`:

1. See script body for ordered statements.

## Tables

| Table | Read or write |
|---|---|
| `dbo.POBCandidateDetailHistory` | write |
| `dbo.POBCandidate` | read |

## Flow

```mermaid
flowchart TD
  Start["USP_POBCandidateDetailHistory_SaveUpdate"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
