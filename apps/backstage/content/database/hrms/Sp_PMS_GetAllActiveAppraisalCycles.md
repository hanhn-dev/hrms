---
object: Sp_PMS_GetAllActiveAppraisalCycles
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetAllActiveAppraisalCycles.sql
last-analyzed: 2026-11-06
---

# Sp_PMS_GetAllActiveAppraisalCycles

## What it does

Stored procedure `Sp_PMS_GetAllActiveAppraisalCycles`. Reads `TPMSAppraisalCycles`, `TPMS_AppraisalReviewFrequency`. Calls no other procedure or function.

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

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetAllActiveAppraisalCycles.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalCycles` | read |
| `TPMS_AppraisalReviewFrequency` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_PMS_GetAllActiveAppraisalCycles] --> EndNode[Return]
```
