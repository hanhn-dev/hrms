---
object: SP_MyDetails_GetCustomFieldValue
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_MyDetails_GetCustomFieldValue.sql
last-analyzed: 2026-11-09
---

# SP_MyDetails_GetCustomFieldValue

## What it does

Returns custom-field value lookup rows used when reviewing candidate custom fields.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | int |

## Call sequence

Calls no other procedures or functions.

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

Calls no other procedures or functions.

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_MyDetails_GetCustomFieldValue.sql`:

1. See script body for ordered statements.

## Tables

| Table | Read or write |
|---|---|
| `dbo.SYS` | read |
| `dbo.TEmployeeDetailCustomFieldValues` | read |
| `dbo.Temployeedetail_fields` | read |

## Flow

```mermaid
flowchart TD
  Start["SP_MyDetails_GetCustomFieldValue"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
