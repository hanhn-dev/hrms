---
object: SP_GetRRSDonorDetailsSettings
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetRRSDonorDetailsSettings.sql
last-analyzed: 2026-11-16
---

# SP_GetRRSDonorDetailsSettings

## What it does

Returns `IsDonorDetails` from `TCustomerSettings` for an employer. Expense Report uses it to show or hide the budget-source filter section.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetRRSDonorDetailsSettings
  Caller->>Main: execute
  Main-->>Caller: result
```

## Callers

| Caller | Page |
|---|---|
| `EmployeeDAL.getRRSDonorDetailsSettings` | [Report](/docs/guides/expense-and-reimbursement/report) |

## Nested

Calls no other procedures or functions.

## Steps

1. `SELECT IsDonorDetails FROM TCustomerSettings WHERE EmployerId=@EmployerId`.

## Tables

| Table | Read or write |
|---|---|
| `TCustomerSettings` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_GetRRSDonorDetailsSettings] --> Sel[Select IsDonorDetails]
```
