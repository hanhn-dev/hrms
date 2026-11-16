---
object: SP_AdminPMS_ForceClosedAppStatus
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_ForceClosedAppStatus.sql
last-analyzed: 2026-11-06
---

# SP_AdminPMS_ForceClosedAppStatus

## What it does

Stored procedure `SP_AdminPMS_ForceClosedAppStatus`. Writes `TRequestWorkflows`, `TPMSEmployeeSelfAppraisal`, `TPMSEMPLOYEEGOALMAPPING`. Reads `Temployee`. Calls `Sp_InsHomePageNotificationCnts`, `Fn_GetHomePageNotificationIdByRequestType`, `Fn_GetEmployeeName`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employeeid` | in | Varchar(Max) |
| `@CycleId` | in | Int |
| `@Comments` | in | Varchar(100) |
| `@UpdatedBy` | in | Int |
| `@IsAppraisalType` | in | bit, default 1 |
| `@ReviewFrequncyId` | in | int, default 0 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminPMS_ForceClosedAppStatus
  participant C0 as Sp_InsHomePageNotificationCnts
  participant C1 as Fn_GetHomePageNotificationIdByRequestType
  participant C2 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>C0: direct call
  Main->>C1: direct call
  Main->>C2: direct call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_InsHomePageNotificationCnts` | procedure | direct call | [Sp_InsHomePageNotificationCnts](/docs/database/hrms/Sp_InsHomePageNotificationCnts) |
| `Fn_GetHomePageNotificationIdByRequestType` | function | direct call | [Fn_GetHomePageNotificationIdByRequestType](/docs/database/hrms/Fn_GetHomePageNotificationIdByRequestType) |
| `Fn_GetEmployeeName` | function | direct call | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminPMS_ForceClosedAppStatus.sql`.
2. Insert into @Lv_Empid
3. When if(@IsAppraisalType=1)
4. When IF @lv_cnt>0
5. Exec [dbo].[Sp_InsHomePageNotificationCnts] @Lv_EmployeeId,@Employerid,0,-1,@Lv_HomePagaNotificationId,'SelfAssessment',@lv_Transid,'SP_ForceClosedAppraisalStatus'
6. Exec [dbo].[Sp_InsHomePageNotificationCnts] @lv_ManagerId,@Employerid,-1,0,@Lv_HomePagaNotificationId,'SelfAssessment',@lv_Transid,'SP_ForceClosedAppraisalStatus','Pending in Manag
7. Update TRequestWorkflows
8. Update TPMSEmployeeSelfAppraisal
9. Else branch.
10. Update TPMSEMPLOYEEGOALMAPPING

## Tables

| Table | Read or write |
|---|---|
| `TPMSEMPLOYEEGOALMAPPING` | write |
| `TPMSEmployeeSelfAppraisal` | read and write |
| `TRequestWorkflows` | read and write |
| `Temployee` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminPMS_ForceClosedAppStatus] --> S0
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> S5
  S5 --> EndNode[Return]
  S0[Insert into Lv_Empid]
  S1[When if IsAppraisalType=1]
  S2[When IF lv_cnt>0]
  S3[Exec dbo . Sp_InsHomePageNotificationCnts Lv_EmployeeId, Employerid,0,]
  S4[Exec dbo . Sp_InsHomePageNotificationCnts lv_ManagerId, Employerid,-1,]
  S5[Update TRequestWorkflows]
```
