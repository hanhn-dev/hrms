---
object: SP_Celebration_EmployeeSearch
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_EmployeeSearch.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_EmployeeSearch

## What it does

Typeahead search of active employees for the broadcast wizard.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@Search` | in | Input (`NVARCHAR(100)`) |
| `@CategoryCode` | in | Input (`VARCHAR(30)`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_EmployeeSearch
  participant N0 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>N0: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | Called while this object runs | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_EmployeeSearch.sql`:

1. Typeahead search of active employees for the broadcast wizard.

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TEmployeeInfo` | read |
| `TTitle` | read |
| `TOrgHierarchyDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_EmployeeSearch] --> Run[Apply the inputs]
  Run --> Child[Fn_GetEmployeeName]
  Child --> Done[Return the result]
```
