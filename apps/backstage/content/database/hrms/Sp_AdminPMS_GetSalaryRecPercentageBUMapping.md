---
object: Sp_AdminPMS_GetSalaryRecPercentageBUMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetSalaryRecPercentageBUMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetSalaryRecPercentageBUMapping

## What it does

Stored procedure `Sp_AdminPMS_GetSalaryRecPercentageBUMapping`. Reads `TOrgHierarchyDetails`, `TPMSSalaryRecPercentageForMapping`, `TPMSSalaryRecPercentageForBU`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleId` | in | INT |
| `@RatingId` | in | Int |
| `@EmployerId` | in | Int |
| `@RecPercentageForMappingid` | in | int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetSalaryRecPercentageBUMapping.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TOrgHierarchyDetails` | read |
| `TPMSSalaryRecPercentageForBU` | read |
| `TPMSSalaryRecPercentageForMapping` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetSalaryRecPercentageBUMapping] --> EndNode[Return]
```
