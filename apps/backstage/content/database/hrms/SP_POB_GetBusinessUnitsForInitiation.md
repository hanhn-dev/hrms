---
object: SP_POB_GetBusinessUnitsForInitiation
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_POB_GetBusinessUnitsForInitiation.sql
last-analyzed: 2026-11-09
---

# SP_POB_GetBusinessUnitsForInitiation

## What it does

Returns active business units for an employer on the Initiation screen. @EmployeeId is accepted but not used to filter.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |
| `@EmployeeId` | in | INT |

## Call sequence

Calls no other procedures or functions.

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

Calls no other procedures or functions.

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_POB_GetBusinessUnitsForInitiation.sql`:

1. See script body for ordered statements.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TOrgHierarchyDetails` | read |

## Flow

```mermaid
flowchart TD
  Start["SP_POB_GetBusinessUnitsForInitiation"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
