---
object: SP_InsertEmployeeHomePagePreferences
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_InsertEmployeeHomePagePreferences.sql
last-analyzed: 2026-11-06
---

# SP_InsertEmployeeHomePagePreferences

## What it does

Saves the Home card layout. It inserts a preference row for the employee and employer, or updates the existing row. A PreferenceIds value of 0 is stored as NULL, which is how reset returns the employee to the employer default.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | Employee the Home screen is loading or acting for (`int`) |
| `@EmployerId` | in | Employer that owns the data (`int`) |
| `@PreferenceIds` | in | Comma-separated preference ids to save. 0 clears the saved list (`varchar(1000)`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_InsertEmployeeHomePagePreferences
  Caller->>Main: execute
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_InsertEmployeeHomePagePreferences.sql`:

1. Saves the Home card layout.
2. It inserts a preference row for the employee and employer, or updates the existing row.
3. A PreferenceIds value of 0 is stored as NULL, which is how reset returns the employee to the employer default.

## Tables

| Table | Read or write |
|---|---|
| `TEmployeeHomePagePreferences` | read and write |

## Flow

```mermaid
flowchart TD
  Start[SP_InsertEmployeeHomePagePreferences] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
