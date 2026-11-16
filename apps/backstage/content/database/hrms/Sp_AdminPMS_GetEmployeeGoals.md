---
object: Sp_AdminPMS_GetEmployeeGoals
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetEmployeeGoals.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetEmployeeGoals

## What it does

Stored procedure `Sp_AdminPMS_GetEmployeeGoals`. Reads `TPMSEmployeeGoalSetting`. Calls no other procedure or function.

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

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetEmployeeGoals.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSEmployeeGoalSetting` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetEmployeeGoals] --> EndNode[Return]
```
