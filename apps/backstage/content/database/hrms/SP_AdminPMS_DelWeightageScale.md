---
object: SP_AdminPMS_DelWeightageScale
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_DelWeightageScale.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_DelWeightageScale

## What it does

Stored procedure `SP_AdminPMS_DelWeightageScale`. Writes `TPMSWeightageMaster`. Reads `TPMSAppraisalCycles`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@WeightageId` | in | INT |
| `@EmployerId` | in | INT |
| `@ModifiedBy` | in | INT |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_DelWeightageScale.sql`.
2. When If ( SELECT
3. Else branch.
4. UPDATE TPMSWeightageMaster

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalCycles` | read |
| `TPMSWeightageMaster` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_DelWeightageScale] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> EndNode[Return]
  S0[When If SELECT]
  S1[Else branch.]
  S2[UPDATE TPMSWeightageMaster]
```
