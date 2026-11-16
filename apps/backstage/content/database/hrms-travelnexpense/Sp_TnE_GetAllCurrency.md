---
object: Sp_TnE_GetAllCurrency
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/Sp_TnE_GetAllCurrency.sql
last-analyzed: 2026-11-16
---

# Sp_TnE_GetAllCurrency

## What it does

Returns every row from `TCountry` ordered by `CURRENCYCODE` for Report currency dropdowns.

## Parameters

None.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TnE_GetAllCurrency
  Caller->>Main: execute
  Main-->>Caller: result
```

## Callers

| Caller | Page |
|---|---|
| `TravelDAL.GetAllCurrency` | [Report](/docs/guides/expense-and-reimbursement/report) |

## Nested

Calls no other procedures or functions.

## Steps

1. `SELECT * FROM TCountry ORDER BY CURRENCYCODE`.

## Tables

| Table | Read or write |
|---|---|
| `TCountry` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[Sp_TnE_GetAllCurrency] --> Sel[Select TCountry]
```
