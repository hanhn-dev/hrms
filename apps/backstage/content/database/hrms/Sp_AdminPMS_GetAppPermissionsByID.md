---
object: Sp_AdminPMS_GetAppPermissionsByID
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAppPermissionsByID.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetAppPermissionsByID

## What it does

Stored procedure `Sp_AdminPMS_GetAppPermissionsByID`. Reads `TPMSAppraisalViewManagerPermissions`, `TPMS_ViewManagerRatingPermissions`, `TPMS_ViewManagerCommentsPermissions`, `TPMS_ViewEmpManagerRatingPermissions`, `TPMSAppraisalPermissions`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalPermissionsID` | in | Int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAppPermissionsByID.sql`.

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalPermissions` | read |
| `TPMSAppraisalViewManagerPermissions` | read |
| `TPMS_ViewEmpManagerRatingPermissions` | read |
| `TPMS_ViewManagerCommentsPermissions` | read |
| `TPMS_ViewManagerRatingPermissions` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetAppPermissionsByID] --> EndNode[Return]
```
