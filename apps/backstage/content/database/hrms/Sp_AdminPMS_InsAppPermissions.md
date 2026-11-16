---
object: Sp_AdminPMS_InsAppPermissions
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_InsAppPermissions.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_InsAppPermissions

## What it does

Stored procedure `Sp_AdminPMS_InsAppPermissions`. Writes `TPMSAppraisalViewManagerPermissions`, `TPMS_ViewManagerRatingPermissions`, `TPMS_ViewManagerCommentsPermissions`, `TPMS_ViewEmpManagerRatingPermissions`, `TPMSAppraisalPermissions`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleId` | in | Int |
| `@EmployeeIDs` | in | Varchar(MAX) |
| `@Employerid` | in | Int |
| `@EmployeeTypes` | in | Varchar(MAX) |
| `@EmployeeDesignation` | in | Varchar(MAX) |
| `@OrganizationUnits` | in | Varchar(MAX) |
| `@ViewComment` | in | BIT |
| `@CreatedBy` | in | Int |
| `@EmpCommentsMandatory` | in | BIT |
| `@MngrCommentsMandatory` | in | BIT |
| `@UDTAppraisalViewManagerPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@UDTAppraisalManagerRatingPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@UDTAppraisalManagerCommentsPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@UDTAppViewEmpManagerRatingPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@ViewManagerRatingsRequired` | in | bit, default 0 |
| `@ViewEmpManagerRatingsRequired` | in | BIT, default 0 |
| `@ViewEmpManagerCommentsRequired` | in | BIT, default 0 |
| `@IsEnableFinalWeightageToEmp` | in | BIT, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_InsAppPermissions.sql`.
2. Delete TPMSAppraisalPermissions Where AppraisalCycleId = @AppraisalCycleId;
3. Delete TPMSAppraisalViewManagerPermissions Where AppraisalCycleId = @AppraisalCycleId;
4. INSERT INTO TPMSAppraisalViewManagerPermissions (AppraisalPermissionsID, AppraisalCycleId,IsDeleted,ReviewLevelId, ReviewLevel)
5. Delete TPMS_ViewManagerRatingPermissions Where AppraisalCycleId = @AppraisalCycleId;
6. INSERT INTO TPMS_ViewManagerRatingPermissions (AppraisalPermissionsID, AppraisalCycleId,IsDeleted,ReviewLevelId, ReviewLevel)
7. Delete TPMS_ViewManagerCommentsPermissions Where AppraisalCycleId = @AppraisalCycleId;
8. INSERT INTO TPMS_ViewManagerCommentsPermissions (AppraisalPermissionsID, AppraisalCycleId,IsDeleted,ReviewLevelId, ReviewLevel)
9. Delete TPMS_ViewEmpManagerRatingPermissions Where AppraisalCycleId = @AppraisalCycleId;
10. INSERT INTO TPMS_ViewEmpManagerRatingPermissions (AppraisalPermissionsID, AppraisalCycleId,IsDeleted,ReviewLevelId, ReviewLevel)

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalPermissions` | write |
| `TPMSAppraisalViewManagerPermissions` | write |
| `TPMS_ViewEmpManagerRatingPermissions` | write |
| `TPMS_ViewManagerCommentsPermissions` | write |
| `TPMS_ViewManagerRatingPermissions` | write |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_InsAppPermissions] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[Delete TPMSAppraisalPermissions Where AppraisalCycleId = AppraisalCycl]
  S1[Delete TPMSAppraisalViewManagerPermissions Where AppraisalCycleId = Ap]
  S2[INSERT INTO TPMSAppraisalViewManagerPermissions AppraisalPermissionsID]
  S3[Delete TPMS_ViewManagerRatingPermissions Where AppraisalCycleId = Appr]
  S4[INSERT INTO TPMS_ViewManagerRatingPermissions AppraisalPermissionsID, ]
  S5[Delete TPMS_ViewManagerCommentsPermissions Where AppraisalCycleId = Ap]
```
