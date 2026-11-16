---
object: USP_TimesheetTaskDurationSummaryWITHistoryReport
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_TimesheetTaskDurationSummaryWITHistoryReport.sql
last-analyzed: 2026-11-16
---

# USP_TimesheetTaskDurationSummaryWITHistoryReport

## What it does

WIT-breakout sibling of the duration history helper, used when Weekly/Monthly Report includes work-item type grouping.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer CSV |
| `@EmployeeId` | in | Employee CSV |
| `@TimesheetApproverId` | in | Optional approver |
| `@StartDate` | in | Start |
| `@EndDate` | in | End |
| `@ReviewFrequency` | in | Frequency |
| `@ClientIds` | in | Client CSV |
| `@ProjectIds` | in | Project CSV |
| `@StatusIds` | in | Status CSV |
| `@SelectedWITIds` | in | WIT CSV |
| `@requestfrom` | in | Caller flag |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TimesheetTaskDurationSummaryWITHistoryReport
  Caller->>Main: execute
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_TS_GetEmpTimeSheetReportByDateRange` | procedure | [USP_TS_GetEmpTimeSheetReportByDateRange](/docs/database/hrm-timeport/USP_TS_GetEmpTimeSheetReportByDateRange) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| — | — | — | — |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_TimesheetTaskDurationSummaryWITHistoryReport.sql`:

1. Filter timesheets including work-item type.
2. Return WIT-aware duration history rows.

## Tables

| Table | Read or write |
|---|---|
| `TTSEmpTimeSheet` | read |
| `TTSLOOKUP` | read |

## Flow

```mermaid
flowchart TD
  Start[USP_TimesheetTaskDurationSummaryWITHistoryReport] --> Run[Apply inputs]
  Run --> Done[Return result]
```
