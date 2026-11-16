---
object: Sp_AdminPMS_GetEmpAssignedGoalMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetEmpAssignedGoalMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetEmpAssignedGoalMapping

## What it does

Stored procedure `Sp_AdminPMS_GetEmpAssignedGoalMapping`. Reads `TPMSEmployeeGoalSetting`, `TPMSEmployeeGoalMapping`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetEmpAssignedGoalMapping.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSEmployeeGoalMapping` | read |
| `TPMSEmployeeGoalSetting` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetEmpAssignedGoalMapping] --> EndNode[Return]
```
