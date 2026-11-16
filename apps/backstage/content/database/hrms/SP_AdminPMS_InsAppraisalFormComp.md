---
object: SP_AdminPMS_InsAppraisalFormComp
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_InsAppraisalFormComp.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_InsAppraisalFormComp

## What it does

Stored procedure `SP_AdminPMS_InsAppraisalFormComp`. Writes `TPMSAppraisalFormComponents`, `TPMS_AssessmentComponentPermissions`, `TPMS_ViewAssessmentComponentPermissions`. Calls no other procedure or function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@AppraisalCycleid` | in | Int |
| `@ComponentName` | in | Varchar(250) |
| `@ComponentType` | in | Varchar(20) |
| `@NoofChoices` | in | Int |
| `@ChoiceText` | in | Varchar(1000) |
| `@DisplaySequence` | in | Int |
| `@Employerid` | in | Int |
| `@CreatedBy` | in | Int |
| `@IsEvidenceRequired` | in | Bit |
| `@FormType` | in | Varchar(1), default null |
| `@ReviewFrequencyId` | in | int, default 0 |
| `@IsEvidenceRequiredMandatory` | in | bit, default 0 |
| `@UDTAssessmentComponentPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@UDTViewAssessmentComponentPermissions` | in | UDTAppraisalViewManagerPermissions |
| `@ViewAssessmentComponentRequired` | in | bit, default 0 |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_InsAppraisalFormComp.sql`.
2. When If (Select count(1) From TPMSAppraisalFormComponents Where Employerid=@Employerid And upper(ComponentName)=upper(@ComponentName) And isdeleted=0 And ReviewFrequ
3. Else branch.
4. Insert into TPMSAppraisalFormComponents (AppraisalCycleId,ComponentName,ComponentType,NoofChoices,ChoiceText,DisplaySequence,Employerid,CreatedBy,CreateDate,
5. INSERT INTO TPMS_AssessmentComponentPermissions (ComponentId, IsDeleted,ReviewLevelId, ReviewLevel)
6. INSERT INTO TPMS_ViewAssessmentComponentPermissions (ComponentId, IsDeleted,ReviewLevelId, ReviewLevel)

## Tables

| Table | Read or write |
|---|---|
| `TPMSAppraisalFormComponents` | read and write |
| `TPMS_AssessmentComponentPermissions` | write |
| `TPMS_ViewAssessmentComponentPermissions` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_InsAppraisalFormComp] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> EndNode[Return]
  S0[When If Select count 1 From TPMSAppraisalFormComponents Where Employer]
  S1[Else branch.]
  S2[Insert into TPMSAppraisalFormComponents AppraisalCycleId,ComponentName]
  S3[INSERT INTO TPMS_AssessmentComponentPermissions ComponentId, IsDeleted]
  S4[INSERT INTO TPMS_ViewAssessmentComponentPermissions ComponentId, IsDel]
```
