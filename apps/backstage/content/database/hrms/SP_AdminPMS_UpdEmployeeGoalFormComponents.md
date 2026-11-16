---
object: SP_AdminPMS_UpdEmployeeGoalFormComponents
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_UpdEmployeeGoalFormComponents.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_UpdEmployeeGoalFormComponents

## What it does

Stored procedure `SP_AdminPMS_UpdEmployeeGoalFormComponents`. Writes `TPMS_GoalComponentPermissions`, `TPMS_ViewGoalComponentPermissions`, `TPMSEmployeeGoalFormComponents`. Reads `TPMSEmployeeGoalMapping`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Transid` | in | Int |
| `@GoalSettingId` | in | Int |
| `@ComponentName` | in | Varchar(250) |
| `@ComponentType` | in | Varchar(20) |
| `@NoofChoices` | in | Int |
| `@ChoiceText` | in | Varchar(1000) |
| `@DisplaySequnece` | in | Int |
| `@Employerid` | in | Int |
| `@CreatedBy` | in | Int |
| `@IsEvidenceRequired` | in | Bit |
| `@ReviewFrequencyId` | in | int, default 0 |
| `@IsEvidenceRequiredMandatory` | in | bit, default 0 |
| `@UDTGoalComponentPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@UDTViewGoalComponentPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@ViewGoalComponentRequired` | in | bit, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_UpdEmployeeGoalFormComponents.sql`.
2. When If (Select count(1) From TPMSEmployeeGoalMapping Where EmployerID=@Employerid And GoalSettingId=@GoalSettingId and ReviewFrequencyId=@ReviewFrequencyId and IsIn
3. Else branch.
4. Update TPMSEmployeeGoalFormComponents
5. Delete from TPMS_GoalComponentPermissions where ComponentId=@Transid;
6. INSERT INTO TPMS_GoalComponentPermissions (ComponentId, IsDeleted,ReviewLevelId, ReviewLevel)
7. Delete from TPMS_ViewGoalComponentPermissions where ComponentId=@Transid;
8. INSERT INTO TPMS_ViewGoalComponentPermissions (ComponentId, IsDeleted,ReviewLevelId, ReviewLevel)

## Tables

| Table | Read or write |
|---|---|
| `TPMSEmployeeGoalFormComponents` | read and write |
| `TPMSEmployeeGoalMapping` | read |
| `TPMS_GoalComponentPermissions` | read and write |
| `TPMS_ViewGoalComponentPermissions` | read and write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_UpdEmployeeGoalFormComponents] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[When If Select count 1 From TPMSEmployeeGoalMapping Where EmployerID= ]
  S1[Else branch.]
  S2[Update TPMSEmployeeGoalFormComponents]
  S3[Delete from TPMS_GoalComponentPermissions where ComponentId= Transid;]
  S4[INSERT INTO TPMS_GoalComponentPermissions ComponentId, IsDeleted,Revie]
  S5[Delete from TPMS_ViewGoalComponentPermissions where ComponentId= Trans]
```
