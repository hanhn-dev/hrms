---
object: Sp_AdminCMS_GetEmployeeConfirmationRoleMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminCMS_GetEmployeeConfirmationRoleMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminCMS_GetEmployeeConfirmationRoleMapping

## What it does

Returns the roles attached to one confirmation mapping.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ConfirmationMappingId` | in | Confirmation Mapping Id |
| `@EmployerId` | in | Employer Id |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminCMS_GetEmployeeConfirmationRoleMapping.sql`.

1. Select cd.CategoryId,

## Tables

| Table | Read or write |
|---|---|
| `TEmployeeRoleMaster` | read |
| `TCMSEmployeeConfirmationMapping` | read |
| `TCMSEmployeeConfirmationForRole` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminCMS_GetEmployeeConfirmationRoleMapping] --> Body[Run the script body]
```
