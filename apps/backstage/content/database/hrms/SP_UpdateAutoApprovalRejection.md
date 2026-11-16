---
object: SP_UpdateAutoApprovalRejection
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_UpdateAutoApprovalRejection.sql
last-analyzed: 2026-11-16
---

# SP_UpdateAutoApprovalRejection

## What it does

Helper invoked from leave insert auto-approve / rejection housekeeping paths to align request status and related side effects when a leave is decided without a multi-level workflow.

## Parameters

See script — parent leave insert supplies request context after `USP_LA_InsertLeaveRequestDetails` decides the auto path.

## Call sequence

```mermaid
sequenceDiagram
  participant Parent as USP_LA_InsertLeaveRequestDetails
  participant Main as SP_UpdateAutoApprovalRejection
  Parent->>Main: auto-approve context
  Main->>Main: status housekeeping
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_LA_InsertLeaveRequestDetails` | procedure | [USP_LA_InsertLeaveRequestDetails](/docs/database/hrms/USP_LA_InsertLeaveRequestDetails) |

## Nested

Further nests inside the script are outside this one-level pass.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_UpdateAutoApprovalRejection.sql`.
2. Apply auto-approval/rejection housekeeping for the request.

## Tables

| Table | Read or write |
|---|---|
| Request / workflow status tables | read/write |

## Unresolved calls

Inner EXECs not expanded.

## Flow

```mermaid
flowchart TD
  Start[SP_UpdateAutoApprovalRejection] --> Upd[Update auto decision state]
  Upd --> Done[Return to parent]
```
