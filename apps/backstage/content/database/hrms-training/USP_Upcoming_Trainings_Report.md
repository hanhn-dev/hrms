---
object: USP_Upcoming_Trainings_Report
kind: procedure
database: hrms-training
source: HRMS-DATABASE/HRMS-TRAINING/STOREPROCEDURE/USP_Upcoming_Trainings_Report.sql
last-analyzed: 2026-11-06
---

# USP_Upcoming_Trainings_Report

## What it does

Returns upcoming trainings the employee can see on the Home card, including whether they can assign or unassign a seat. The HRMS database reaches this procedure through a synonym to the Training database.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeID` | in | Employee the Home screen is loading or acting for (`INT`) |
| `@EmployerID` | in | Employer that owns the data (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_Upcoming_Trainings_Report
  participant N0 as FN_TimeToSeconds
  Caller->>Main: execute
  Main->>N0: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `FN_TimeToSeconds` | function | Called while this object runs | [FN_TimeToSeconds](/docs/database/hrms/FN_TimeToSeconds) |

## Steps

In `HRMS-DATABASE/HRMS-TRAINING/STOREPROCEDURE/USP_Upcoming_Trainings_Report.sql`:

1. Returns upcoming trainings the employee can see on the Home card, including whether they can assign or unassign a seat.
2. The HRMS database reaches this procedure through a synonym to the Training database.

## Tables

| Table | Read or write |
|---|---|
| `OT` | write |
| `TEmployerDetails` | read |
| `TTraining` | read |
| `TAssignment` | read |
| `TTrainingSession` | read |
| `TOnlineTrainingCompletion` | read |
| `TTrainers` | read |

## Flow

```mermaid
flowchart TD
  Start[USP_Upcoming_Trainings_Report] --> Run[Apply the inputs]
  Run --> Child[FN_TimeToSeconds]
  Child --> Done[Return the result]
```
