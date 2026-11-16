---
object: SP_TNE_DeleteExpenseReportData
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_DeleteExpenseReportData.sql
last-analyzed: 2026-11-16
---

# SP_TNE_DeleteExpenseReportData

## What it does

Deletes one saved expense report after writing a history snapshot via `USP_SaveHistory` (action `D`, history created-by `0`).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ReportID` | in | Primary key to delete |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TNE_DeleteExpenseReportData
  participant Hist as USP_SaveHistory
  Caller->>Main: execute
  Main->>Hist: ActionType D
  Main-->>Caller: delete complete
```

## Callers

| Caller | Page |
|---|---|
| `ReportsDAL.DeleteExpenseSavedReportData` | [Report](/docs/guides/expense-and-reimbursement/report) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_SaveHistory` | procedure (T&E synonym to HRMS) | before DELETE | unresolved — no CREATE script in HRMS Liquibase inventory |

## Steps

1. `EXEC USP_SaveHistory` for the report id.
2. `DELETE FROM ExpenseReportdata WHERE ReportID=@ReportID`.

## Tables

| Table | Read or write |
|---|---|
| `ExpenseReportdata` | write |
| `ExpenseReportdata_History` | write via history helper |

## Unresolved calls

`USP_SaveHistory` body not present as a Liquibase CREATE script under HRMS.

## Flow

```mermaid
flowchart TD
  Start[SP_TNE_DeleteExpenseReportData] --> Hist[USP_SaveHistory]
  Hist --> Del[Delete ExpenseReportdata]
```
