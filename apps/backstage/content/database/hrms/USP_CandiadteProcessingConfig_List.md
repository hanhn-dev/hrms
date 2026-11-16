---
object: USP_CandiadteProcessingConfig_List
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CandiadteProcessingConfig_List.sql
last-analyzed: 2026-11-09
---

# USP_CandiadteProcessingConfig_List

## What it does

Returns candidate-processing configuration rows for an employer, with formatted dates and creator or modifier display names. Optionally filters to one config id.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerID` | in | Employer whose rows are listed |
| `@candiadteProcessingConfigID` | in | Optional single config id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_CandiadteProcessingConfig_List
  participant Fn as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>Fn: CreatedBy and ModifyBy display names
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | for CreatedBy and ModifyBy | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. Select config columns from `TcandiadteProcessingConfig` for `@EmployerID`, optionally filtered by `@candiadteProcessingConfigID`.
2. Resolve CreatedBy and ModifyBy through `Fn_GetEmployeeName` and format date columns.

## Tables

| Table | Read or write |
|---|---|
| `TcandiadteProcessingConfig` | read |

## Flow

```mermaid
flowchart TD
  Start[USP_CandiadteProcessingConfig_List] --> Read[Read config rows]
  Read --> Names[Resolve employee names]
```
