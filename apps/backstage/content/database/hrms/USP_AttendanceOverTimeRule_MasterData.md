---
object: USP_AttendanceOverTimeRule_MasterData
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_AttendanceOverTimeRule_MasterData.sql
last-analyzed: 2026-11-16
---

# USP_AttendanceOverTimeRule_MasterData

## What it does

Returns Core HRMS master lists (shifts, grades, designations, business units) used by TimePort Configuration pickers. Called from TimePort DAL on the Core connection.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerID` | in | Employer id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_AttendanceOverTimeRule_MasterData
  Caller->>Main: execute
```

## Callers

Application. timeportDAL.GetMasterDataForConfig on the Core connection. Also used by attendance overtime setup screens.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_AttendanceOverTimeRule_MasterData.sql`:

1. Return active shifts from TSHIFTMASTER.
2. Return active grades from TGrade.
3. Return active designations from TTitle.
4. Return active business units from TOrgHierarchyDetails.
5. Return related employee or master result sets for the employer.

## Tables

| Table | Read or write |
|---|---|
| `TSHIFTMASTER` | read |
| `TGrade` | read |
| `TTitle` | read |
| `TOrgHierarchyDetails` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[USP_AttendanceOverTimeRule_MasterData] --> S0
  S0["Return active shifts from TSHIFTMASTER."]
  S1["Return active grades from TGrade."]
  S2["Return active designations from TTitle."]
  S3["Return active business units from TOrgHierarchyDetails."]
  S4["Return related employee or master result sets for the employ"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
  S4 --> Done[Return]
```
