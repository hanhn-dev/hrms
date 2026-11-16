---
object: Sp_AdminPMS_GetAppraisalCyclesForCopyEmpMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAppraisalCyclesForCopyEmpMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetAppraisalCyclesForCopyEmpMapping

## What it does

Stored procedure `Sp_AdminPMS_GetAppraisalCyclesForCopyEmpMapping`. Reads `TPMSAppraisalCycles`, `TPMS_AppraisalReviewFrequency`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Int |
| `@CategoryId` | in | int, default null |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAppraisalCyclesForCopyEmpMapping.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalCycles` | read |
| `TPMS_AppraisalReviewFrequency` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetAppraisalCyclesForCopyEmpMapping] --> EndNode[Return]
```
