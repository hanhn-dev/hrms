---
object: Sp_PMS_GetRatingDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetRatingDetails.sql
last-analyzed: 2026-11-06
---

# Sp_PMS_GetRatingDetails

## What it does

Lists rating scales and their level rows for an employer. `@ActiveType` chooses active, inactive, or both.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employerid |
| `@ActiveType` | in | Active Type |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetRatingDetails.sql`.

1. If @ActiveType='A'
2. Select tr.Ratingid,
3. Else if @ActiveType='B'
4. Select tr.Ratingid,

## Tables

| Table | Read or write |
|---|---|
| `Tpmsratingscaledetails` | read |
| `Tpmsratingmaster` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_PMS_GetRatingDetails] --> Body[Run the script body]
```
