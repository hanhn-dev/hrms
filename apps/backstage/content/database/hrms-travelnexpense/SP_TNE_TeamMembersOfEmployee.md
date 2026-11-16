---
object: SP_TNE_TeamMembersOfEmployee
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_TeamMembersOfEmployee.sql
last-analyzed: 2026-11-16
---

# SP_TNE_TeamMembersOfEmployee

## What it does

Returns active employees under the given manager via functional manager or org-chart reports-to, intersected with `FN_LocationBU_GetEmployeeDetails` scope for that manager.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployeeId` | in | Manager employee id |
| `@EmployerId` | in | Employer |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TNE_TeamMembersOfEmployee
  participant Scope as FN_LocationBU_GetEmployeeDetails
  Caller->>Main: execute
  Main->>Scope: scope employees
  Main-->>Caller: team member rows
```

## Callers

App: `ExpenseDAL.GetTeamMembersOfEmployee` → `ExpenseController.GetTeamMembersOfEmployee` from [Expense Requests](/docs/guides/expense-and-reimbursement/expense-requests) filters.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `FN_LocationBU_GetEmployeeDetails` | function | always | [FN_LocationBU_GetEmployeeDetails](/docs/database/hrms-travelnexpense/FN_LocationBU_GetEmployeeDetails) |

## Steps

1. Script is `SP_TNE_TeamMembersOfEmployee.sql`.
2. Join employee/info/BU to scope function results.
3. Keep rows where functional manager or `TORGChart.ReportsTo` is `@pEmployeeId` and employee is active for employer.

## Tables

| Table | Read or write |
|---|---|
| `TEmployee` | read |
| `TEmployeeInfo` | read |
| `TOrgHierarchyDetails` | read |
| `TORGChart` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[TeamMembersOfEmployee] --> Scope[FN_LocationBU_GetEmployeeDetails]
  Scope --> Filter[Functional or ReportsTo]
```
