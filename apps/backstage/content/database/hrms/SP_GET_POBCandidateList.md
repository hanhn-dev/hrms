---
object: SP_GET_POBCandidateList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GET_POBCandidateList.sql
last-analyzed: 2026-11-09
---

# SP_GET_POBCandidateList

## What it does

Lists RRS and saved pre-onboarding candidates for Initiation, optionally filtered by business-unit ids.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | INT |
| `@BusinessUnitIds` | in | VARCHAR |

## Call sequence

Calls no other procedures or functions.

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

Calls no other procedures or functions.

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GET_POBCandidateList.sql`:

1. See script body for ordered statements.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRRSCandidateMapping` | read |
| `dbo.TRRSDetails` | read |
| `dbo.TOrgHierarchyDetails` | read |
| `dbo.TMAddCandidate` | read |
| `dbo.TRRSCandidate` | read |
| `dbo.POBCandidate` | read |
| `dbo.TEmployee` | read |

## Flow

```mermaid
flowchart TD
  Start["SP_GET_POBCandidateList"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
