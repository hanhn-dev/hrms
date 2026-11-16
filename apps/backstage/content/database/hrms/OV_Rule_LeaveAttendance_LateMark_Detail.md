---
object: OV_Rule_LeaveAttendance_LateMark_Detail
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_Rule_LeaveAttendance_LateMark_Detail.sql
last-analyzed: 2026-11-16
---

# OV_Rule_LeaveAttendance_LateMark_Detail

## What it does

Scores Late Mark for one employee into `#MasterDetailResult` from late `TAttendance` rows after the effective date, skipping active excludes.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ModuleName` | in | Module label echoed on the result |
| `@CategoryName` | in | Category label echoed on the result |
| `@ActivityName` | in | Activity label echoed on the result |
| `@ActivityDescription` | in | Activity description echoed on the result |
| `@EffectiveDtm` | in | Effective date passed from the activity master |
| `@OccuranceVialoationMasterID` | in | Activity master id whose detail bands apply |
| `@EmployeeId` | in | Employee being scored or shown on the card |
| `@Employerid` | in | Employer scope |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object by name. `OV_Rule_DetailSP` builds dynamic `EXEC CategoryMaster.SPName + '_Detail'` for active categories.

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_Rule_LeaveAttendance_LateMark_Detail.sql`, set `NOCOUNT` and `READ UNCOMMITTED`.
2. Score category-specific hits for `@EmployeeId` / `@Employerid` from `@EffectiveDtm`, applying exclude filters where present.
3. Match hits to activity-detail condition bands.
4. INSERT aggregated point rows into the caller-created `#MasterDetailResult`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.OccuranceVialoationActivityDetail` | read |
| `dbo.OccuranceVialoationExclude` | read |
| `dbo.TShiftMaster` | read |
| `#MasterDetailResult` | write (insert into caller temp) |

## Flow

```mermaid
flowchart TD
  Start["OV_Rule_LeaveAttendance_LateMark_Detail"]
  Hits["Score hits for employee"]
  Match["Match condition bands"]
  Ins["Insert into MasterDetailResult"]
  Start --> Hits
  Hits --> Match
  Match --> Ins
```
