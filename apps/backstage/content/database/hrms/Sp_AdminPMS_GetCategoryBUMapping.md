---
object: Sp_AdminPMS_GetCategoryBUMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetCategoryBUMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetCategoryBUMapping

## What it does

Stored procedure `Sp_AdminPMS_GetCategoryBUMapping`. Reads `TOrgHierarchyDetails`, `TPMSCategoryDesignationMapping`, `TPMSDesignationMappingForBU`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CategoryId` | in | Int |
| `@EmployerId` | in | Int |
| `@AppraisalCycleId` | in | INT |
| `@GoalSettingId` | in | INT |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetCategoryBUMapping.sql`.
2. When if(isnull(@AppraisalCycleId,0)>0)
3. Else branch.

## Tables

| Table | Read or write |
|---|---|
| `TOrgHierarchyDetails` | read |
| `TPMSCategoryDesignationMapping` | read |
| `TPMSDesignationMappingForBU` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetCategoryBUMapping] --> S0
  S0 --> S1
  S1 --> EndNode[Return]
  S0[When if isnull AppraisalCycleId,0 >0]
  S1[Else branch.]
```
