---
object: Sp_TnE_UpdBulkExpensePayments
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/Sp_TnE_UpdBulkExpensePayments.sql
last-analyzed: 2026-11-16
---

# Sp_TnE_UpdBulkExpensePayments

## What it does

Marks payment lines as paid for a CSV of expense ids that are currently in lookup text `Pending with Accounts`: sets `AmountPaid = AmountApproved`, stores comments/payment mode/editor, queues `ExpensePayment` email notification rows, and inserts status history for Amount Paid (1055) and Request Completed (1080).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ExpenseIDs` | in | Comma-separated expense ids |
| `@Notes` | in | Payment comments |
| `@LoginID` | in | Actor employee id |
| `@PaidPaymentModeId` | in | Payment mode lookup |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_TnE_UpdBulkExpensePayments
  participant Pay as TEXPENSE_PAYMENT
  participant Mail as TEMAIL_NOTIFICATION
  participant St as TEXPENSE_STATUS
  Caller->>Main: execute
  Main->>Pay: set AmountPaid for pending-with-accounts rows
  Main->>Mail: insert ExpensePayment notifications
  Main->>St: insert 1055 and 1080 status rows
```

## Callers

App: `ExpenseDAL` execute of `Sp_TnE_UpdBulkExpensePayments` → `ExpenseController.UpdBulkExpensePayments` from Reimbursement tab on [Expense Requests](/docs/guides/expense-and-reimbursement/expense-requests).

## Nested

None.

## Steps

1. Script is `Sp_TnE_UpdBulkExpensePayments.sql`.
2. Update matching `TEXPENSE_PAYMENT` rows joined to expenses whose latest status text is `Pending with Accounts`; capture ids into `#PaidExpense`.
3. If any rows updated, insert `TEMAIL_NOTIFICATION` (`ExpensePayment`) and `TEXPENSE_STATUS` for 1055 then 1080 when missing.

## Tables

| Table | Read or write |
|---|---|
| `TEXPENSE_PAYMENT` | write |
| `TEXPENSE` | read |
| `TEXPENSE_STATUS` | read/write |
| `TLOOKUP` | read |
| `TEMAIL_NOTIFICATION` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[UpdBulkExpensePayments] --> Upd[Update payments]
  Upd --> Mail[Queue notifications]
  Mail --> Status[Insert paid and completed status]
```
