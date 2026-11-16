---
object: USP_EmployeeIdealHourDetail
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_EmployeeIdealHourDetail.sql
last-analyzed: 2026-11-16
---

# USP_EmployeeIdealHourDetail

## What it does

Ideal-hours helper for Compliance summary. Takes `UDT_EmployeeTotalCapacity` and returns ideal working hours per employee window (nests shift detail one level deeper).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@UDT_EmployeeTotalCapacity` | in | TVP of employee/date windows |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_EmployeeIdealHourDetail
  Caller->>Main: execute
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_TTSEmpTimeSheet_TaskDuration` | procedure | [USP_TTSEmpTimeSheet_TaskDuration](/docs/database/hrm-timeport/USP_TTSEmpTimeSheet_TaskDuration) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_EmployeeShifDetail` | procedure | shift calendar expansion | — |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_EmployeeIdealHourDetail.sql`:

1. Copy UDT to temp tables.
2. Call `USP_EmployeeShifDetail` for shift calendar.
3. Aggregate ideal hours and return.

## Tables

| Table | Read or write |
|---|---|
| `UDT_EmployeeTotalCapacity` | read (TVP) |

## Flow

```mermaid
flowchart TD
  Start[USP_EmployeeIdealHourDetail] --> Run[Apply inputs]
  Run --> Done[Return result]
```
