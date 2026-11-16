---
object: SP_Celebration_TemplateList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_TemplateList.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_TemplateList

## What it does

Lists celebration templates available when composing a broadcast.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_TemplateList
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

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_TemplateList.sql`:

1. Lists celebration templates available when composing a broadcast.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationTemplate` | read |
| `TEmployeeInfo` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_TemplateList] --> Run[Apply the inputs]
  Run --> Child[Fn_GetEmployeeName]
  Child --> Done[Return the result]
```
