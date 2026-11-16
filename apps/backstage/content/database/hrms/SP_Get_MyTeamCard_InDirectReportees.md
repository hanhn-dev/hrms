---
object: SP_Get_MyTeamCard_InDirectReportees
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_Get_MyTeamCard_InDirectReportees.sql
last-analyzed: 2026-11-06
---

# SP_Get_MyTeamCard_InDirectReportees

## What it does

Returns one page of indirect reportees for the My Team card, using the same location and business-unit visibility filter and today's attendance and leave status.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employeeid` | in | Employee the Home screen is loading or acting for (`INT`) |
| `@Employerid` | in | Employer that owns the data (`INT`) |
| `@EmployeeName` | in | Optional name filter. Empty means do not filter by name (`VARCHAR(100)`) |
| `@PageNumber` | in | Page number for the list. Empty uses the procedure default (`INT`) |
| `@PageSize` | in | Page size for the list. Empty uses the procedure default (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Get_MyTeamCard_InDirectReportees
  participant N0 as Fn_GetEmployeeName
  participant N1 as FN_GetLocalTime
  participant N2 as Fn_DirectIndirectReportee
  participant N3 as FN_LocationBU_GetEmployeeDetails
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
  Main->>N3: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | Called while this object runs | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `FN_GetLocalTime` | function | Called while this object runs | [FN_GetLocalTime](/docs/database/hrms/FN_GetLocalTime) |
| `Fn_DirectIndirectReportee` | function | Called while this object runs | [Fn_DirectIndirectReportee](/docs/database/hrms/Fn_DirectIndirectReportee) |
| `FN_LocationBU_GetEmployeeDetails` | function | Called while this object runs | [FN_LocationBU_GetEmployeeDetails](/docs/database/hrms/FN_LocationBU_GetEmployeeDetails) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_Get_MyTeamCard_InDirectReportees.sql`:

1. Returns one page of indirect reportees for the My Team card, using the same location and business-unit visibility filter and today's attendance and leave status.

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TAttendanceTransaction` | read |
| `TLeaveRequestDays` | read |
| `TLeaveTypeMaster` | read |
| `TEmployeeInfo` | read |
| `TEmployerDetails` | read |
| `TOrgHierarchyDetails` | read |
| `TEmployeeContactDetails` | read |
| `TTitle` | read |
| `TLocation` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Get_MyTeamCard_InDirectReportees] --> Run[Apply the inputs]
  Run --> Child[Fn_GetEmployeeName, FN_GetLocalTime, Fn_DirectIndirectReportee]
  Child --> Done[Return the result]
```
