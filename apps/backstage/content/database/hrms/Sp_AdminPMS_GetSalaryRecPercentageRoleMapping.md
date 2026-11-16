---
object: Sp_AdminPMS_GetSalaryRecPercentageRoleMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetSalaryRecPercentageRoleMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetSalaryRecPercentageRoleMapping

## What it does

Stored procedure `Sp_AdminPMS_GetSalaryRecPercentageRoleMapping`. Reads `TEmployeeRoleMaster`, `TPMSSalaryRecPercentageForMapping`, `TPMSSalaryRecPercentageForRole`. Calls no other procedure or function.

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

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetSalaryRecPercentageRoleMapping.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TEmployeeRoleMaster` | read |
| `TPMSSalaryRecPercentageForMapping` | read |
| `TPMSSalaryRecPercentageForRole` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetSalaryRecPercentageRoleMapping] --> EndNode[Return]
```
