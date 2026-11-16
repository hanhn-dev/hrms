---
object: SP_LeaveAttendanceGetTeamAvailabilityCalendarDrillDown_Compact
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LeaveAttendanceGetTeamAvailabilityCalendarDrillDown_Compact.sql
last-analyzed: 2026-11-16
---

# SP_LeaveAttendanceGetTeamAvailabilityCalendarDrillDown_Compact

## What it does

Employee rows for one availability status on a calendar day.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| — | — | No parameters declared |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object. Node `leaveAttendanceManagementDashboardDAL.getTeamAvailabilityAndCapacityDrillDown` executes it.

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LeaveAttendanceGetTeamAvailabilityCalendarDrillDown_Compact.sql`, accept the declared parameters and set `NOCOUNT` / read-uncommitted as scripted.
2. Run the SELECT branches shown in the script and return the result set(s).

## Tables

| Table | Read or write |
|---|---|
| — | No persistent tables detected in static parse |

## Flow

```mermaid
flowchart TD
  Start["SP_LeaveAttendanceGetTeamAvailabilityCalendarDrillDown_Compact"] --> Work["Run scripted reads"]
  Work --> Done["Return result set(s)"]
```
