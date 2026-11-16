---
object: SP_RnR_Budget_SearchEmployees
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_RnR_Budget_SearchEmployees.sql
last-analyzed: 2026-11-16
---

# SP_RnR_Budget_SearchEmployees

## What it does

Recipient typeahead for Give Recognition. Trims `@Search`, requires at least two characters, then returns up to 25 active employees at the employer whose employee id, employment number, or first/last name contain the term. Display name prefers `FN_GetEmployeeName_Multi`, falling back to concatenated `FName` / `LName`. Read-only aside from the name function.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |
| `@Search` | in | Search term. After trim, must be at least two characters |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_RnR_Budget_SearchEmployees
  participant Name as FN_GetEmployeeName_Multi
  Caller->>Main: execute
  Main->>Name: per matching employee (display name)
  Main-->>Caller: TOP 25 rows
```

## Callers

No other procedure or function in `HRMS-RewardNRecognition/STORED_PROCEDURE` executes this object. App callers live in the Rewards_and_Recognition backend that is not in this SourceCode checkout.

| Object | Kind | Page |
|---|---|---|
| Give Recognition React / RnR API | app | [Give Recognition](/docs/guides/reward-and-recognition/give-recognition) (host only; API not in checkout) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `FN_GetEmployeeName_Multi` | function | every result row (display name) | [FN_GetEmployeeName_Multi](/docs/database/hrms/FN_GetEmployeeName_Multi) |

## Steps

In `HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_RnR_Budget_SearchEmployees.sql`:

1. Trim `@Search` into `@Term`.
2. Throw `51600` if length of `@Term` is less than 2.
3. Select top 25 active `TEmployee` rows for the employer joined to `TEmployeeInfo`, matching id, employment number, or concatenated name.
4. Order by `EmployeeId`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_RnR_Budget_SearchEmployees] --> Trim[Trim search term]
  Trim --> Len{length >= 2}
  Len -->|no| Err[THROW 51600]
  Len -->|yes| Select[TOP 25 active employees]
  Select --> Done[Return]
```
