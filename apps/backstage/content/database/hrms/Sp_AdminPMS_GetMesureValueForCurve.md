---
object: Sp_AdminPMS_GetMesureValueForCurve
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetMesureValueForCurve.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetMesureValueForCurve

## What it does

Stored procedure `Sp_AdminPMS_GetMesureValueForCurve`. Reads `TPMSGOALCATEGORY`, `TPMSGOALCATEGORYDETAILS`. Calls no other procedure or function.

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

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetMesureValueForCurve.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSGOALCATEGORY` | read |
| `TPMSGOALCATEGORYDETAILS` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetMesureValueForCurve] --> EndNode[Return]
```
