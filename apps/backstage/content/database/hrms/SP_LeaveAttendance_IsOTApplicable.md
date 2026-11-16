---
object: SP_LeaveAttendance_IsOTApplicable
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LeaveAttendance_IsOTApplicable.sql
last-analyzed: 2026-11-16
---

# SP_LeaveAttendance_IsOTApplicable

## What it does

Returns whether overtime features are applicable for the employer (gates Overtime Calendar).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerID` | in | `INT` |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object. Node `leaveAttendanceManagementDashboardDAL.getOTApplicability` executes it.

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_LeaveAttendance_IsOTApplicable.sql`, accept the declared parameters and set `NOCOUNT` / read-uncommitted as scripted.
2. Run the SELECT branches shown in the script and return the result set(s).

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployerOTSettings` | read |
| `dbo.TClaimOTRule` | read |

## Flow

```mermaid
flowchart TD
  Start["SP_LeaveAttendance_IsOTApplicable"] --> Work["Run scripted reads"]
  Work --> Done["Return result set(s)"]
```
