---
object: SP_AdminPMS_GetMeasureValAvailableForKRA
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetMeasureValAvailableForKRA.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_GetMeasureValAvailableForKRA

## What it does

Stored procedure `SP_AdminPMS_GetMeasureValAvailableForKRA`. Reads `TPMSGoalCategory`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_GetMeasureValAvailableForKRA.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSGoalCategory` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_GetMeasureValAvailableForKRA] --> EndNode[Return]
```
