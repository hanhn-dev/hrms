---
object: SP_AdminCMS_InsConfirmationComponents
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminCMS_InsConfirmationComponents.sql
last-analyzed: 2026-11-06
---

# SP_AdminCMS_InsConfirmationComponents

## What it does

Inserts an additional confirmation component, its apply-to and view levels, and the forms it belongs to, unless the name or display order already exists.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ComponentName` | in | Component Name |
| `@ComponentType` | in | Component Type |
| `@NoofChoices` | in | Noof Choices |
| `@ChoiceText` | in | Choice Text |
| `@DisplaySequence` | in | Display Sequence |
| `@Employerid` | in | Employerid |
| `@CreatedBy` | in | Created By |
| `@IsEvidenceRequired` | in | Is Evidence Required |
| `@IsEvidenceRequiredMandatory` | in | Is Evidence Required Mandatory. Default 0 |
| `@UDTConfirmationComponentPermissions` | in | UDTConfirmation Component Permissions. Table-valued parameter |
| `@UDTViewConfirmationComponentPermissions` | in | UDTView Confirmation Component Permissions. Table-valued parameter |
| `@ViewConfirmationComponentRequired` | in | View Confirmation Component Required. Default 0 |
| `@CategoryIds` | in | Category Ids. Default '' |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminCMS_InsConfirmationComponents
  participant C0 as Split
  Caller->>Main: execute
  Main->>C0: Split
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Split` | function | during execution | [Split](/docs/database/hrms/Split) |

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminCMS_InsConfirmationComponents.sql`.

1. If (Select count(1) From TCMSConfirmationComponents Where Employerid=@Employerid And Upper(ComponentName)=Upper(@ComponentName) And isdeleted=0 )>0
2. Select 1 ErroCode, 'Component not inserted, since Component name or display order is already exists.' ErrorMsg,0 UpdateStatus
3. Insert into TCMSConfirmationComponents (ComponentName,ComponentType,NoofChoices,ChoiceText,DisplaySequence,Employerid,CreatedBy,CreateDate,isdeleted,IsEvidenceRequired,IsEvidenceRe
4. INSERT INTO TCMS_ConfirmationComponentPermissions (ComponentId, IsDeleted,ReviewLevelId, ReviewLevel)
5. SELECT @lv_ComponentId,0,ReviewLevelId, ReviewLevel
6. INSERT INTO TCMS_ViewConfirmationComponentPermissions (ComponentId, IsDeleted,ReviewLevelId, ReviewLevel)
7. SELECT @lv_ComponentId,0,ReviewLevelId, ReviewLevel
8. Insert Into TCMSConfirmationComponentCategorys(ComponentId,CategoryId)
9. Select @lv_ComponentId, Data As CategoryId
10. Select 0 ErroCode, 'Component inserted successfully.' ErrorMsg,1 UpdateStatus

## Tables

| Table | Read or write |
|---|---|
| `TCMSConfirmationComponents` | read/write |
| `TCMS_ConfirmationComponentPermissions` | write |
| `TCMS_ViewConfirmationComponentPermissions` | write |
| `TCMSConfirmationComponentCategorys` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminCMS_InsConfirmationComponents] --> Body[Run the script body]
  Body --> Nested[Call Split]
  Body --> Write[Write TCMSConfirmationComponents, TCMS_ConfirmationComponentPermissions, TCMS_ViewConfirmationComponentPermissions, TCMSConfirmationComponentCategorys]
```
