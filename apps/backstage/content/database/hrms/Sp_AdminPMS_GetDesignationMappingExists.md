---
object: Sp_AdminPMS_GetDesignationMappingExists
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetDesignationMappingExists.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetDesignationMappingExists

## What it does

Stored procedure `Sp_AdminPMS_GetDesignationMappingExists`. Reads `TPMSCategoryDesignationMapping`, `TPMSDesignationMappingForBU`, `TPMSDesignationMappingForRole`, `TPMSDesignationMappingForDesignation`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CategoryId` | in | Int |
| `@EmployerId` | in | Int |
| `@AppraisalCycleId` | in | Int |
| `@DesignationId` | in | Varchar(4000) |
| `@RoleId` | in | Varchar(4000) |
| `@BusinessUnitId` | in | Varchar(4000) |
| `@EmployeeId` | in | INT, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetDesignationMappingExists.sql`.
2. When if(len(ltrim(@RoleId)) =0) set @RoleId =null
3. When if(len(ltrim(@DesignationId)) =0) set @DesignationId =null
4. When if(len(ltrim(@BusinessUnitId)) =0) set @BusinessUnitId =null
5. When if(ISNULL(@EmployeeId,0)>0)
6. Else branch.
7. When if(@tempCount =0)
8. Else branch.
9. When If @tempMappingCount = 1
10. Else branch.

## Tables

| Table | Read or write |
|---|---|
| `TPMSCategoryDesignationMapping` | read |
| `TPMSDesignationMappingForBU` | read |
| `TPMSDesignationMappingForDesignation` | read |
| `TPMSDesignationMappingForRole` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetDesignationMappingExists] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[When if len ltrim RoleId =0 set RoleId =null]
  S1[When if len ltrim DesignationId =0 set DesignationId =null]
  S2[When if len ltrim BusinessUnitId =0 set BusinessUnitId =null]
  S3[When if ISNULL EmployeeId,0 >0]
  S4[Else branch.]
  S5[When if tempCount =0]
```
