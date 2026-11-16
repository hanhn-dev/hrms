---
object: Sp_AdminCMS_GetEmployeeConfirmationDesMapping
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminCMS_GetEmployeeConfirmationDesMapping.sql
last-analyzed: 2026-11-06
---

# Sp_AdminCMS_GetEmployeeConfirmationDesMapping

## What it does

Returns the designations attached to one confirmation mapping.

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

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminCMS_GetEmployeeConfirmationDesMapping.sql`.

1. Select ecm.CategoryId,

## Tables

| Table | Read or write |
|---|---|
| `TTitle` | read |
| `TCMSEmployeeConfirmationMapping` | read |
| `TCMSEmployeeConfirmationForDesignation` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminCMS_GetEmployeeConfirmationDesMapping] --> Body[Run the script body]
```
