---
object: SP_AdminPMS_GetAllGoalCategory
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetAllGoalCategory.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_GetAllGoalCategory

## What it does

Lists KRA and goal categories for an employer.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employerid |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetAllGoalCategory.sql`.

1. Select gc.Categoryid,

## Tables

| Table | Read or write |
|---|---|
| `TPMSGoalCategory` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_GetAllGoalCategory] --> Body[Run the script body]
```
