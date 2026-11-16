---
object: Sp_TnE_GetUserClaims
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/Sp_TnE_GetUserClaims.sql
last-analyzed: 2026-11-16
---

# Sp_TnE_GetUserClaims

## What it does

Returns the effective Travel & Expense claim list for one signed-in employee at one employer. It first loads claims assigned directly to `@pEmployeeId`. If that set is empty, it falls back to claims assigned to `@pRoleId` for the same employer. Each row is `ClaimId`, `ClaimText`, and short code `CID` (`ClaimText_Short`).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pRoleId` | in | Role used when the employee has no employee-scoped claim rows |
| `@pEmployerid` | in | Employer that scopes `TCLAIM_ASSIGNMENT` |
| `@pEmployeeId` | in | Employee whose direct claim assignments are tried first |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TnE_GetUserClaims
  participant DB as TCLAIM_ASSIGNMENT and TCLAIM
  Caller->>Main: execute
  Main->>DB: insert employee-scoped claims into @ClDetails
  alt @ClDetails empty
    Main->>DB: insert role-scoped claims into @ClDetails
  end
  Main-->>Caller: select ClaimId ClaimText CID
```

## Callers

No other procedure or function calls this object. App callers: `EmployeeDAL.GetTNEClaims` → `EmployeeBLL.GetTNEClaims` → `EmployeeController.GetTNEClaims`, invoked from every Travel & Expense React shell via `setupUser.js` (including [Petty Cash Management](/docs/guides/expense-and-reimbursement/petty-cash-management), Expense Requests, Permission Setup, and siblings).

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/Sp_TnE_GetUserClaims.sql` (file header still contains `USE [TravelNExpense_Prod]`).
2. Create table variable `@ClDetails` (`ClaimId`, `ClaimText`, `CID`).
3. Insert claim rows joined from `TCLAIM_ASSIGNMENT` to `TCLAIM` where `EmployeeId = @pEmployeeId` and `Employerid = @pEmployerid`.
4. If `@ClDetails` has no rows, insert claim rows where `RoleId = @pRoleId` and `Employerid = @pEmployerid`.
5. Select `ClaimId`, `ClaimText`, `CID` from `@ClDetails`.
6. An older role-plus-org-chart branch is fully commented out above the live body and is not executed.

## Tables

| Table | Read or write |
|---|---|
| `TCLAIM_ASSIGNMENT` | read |
| `TCLAIM` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[Sp_TnE_GetUserClaims] --> Emp[Load employee-scoped claims into @ClDetails]
  Emp --> Empty{"Any rows"}
  Empty -->|yes| Return[Return @ClDetails]
  Empty -->|no| Role[Load role-scoped claims into @ClDetails]
  Role --> Return
```
