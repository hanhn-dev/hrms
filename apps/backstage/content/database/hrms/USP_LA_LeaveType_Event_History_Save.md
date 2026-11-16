---
object: USP_LA_LeaveType_Event_History_Save
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_Event_History_Save.sql
last-analyzed: 2026-11-09
---

# USP_LA_LeaveType_Event_History_Save

## What it does

Persists leave-event history for a leave transaction.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveTransactionId` | in | `INT` |
| `@UserID` | in | `INT` |

## Call sequence

Calls no other procedures or functions.

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_LA_LeaveType_Update` | procedure | [USP_LA_LeaveType_Update](/docs/database/hrms/USP_LA_LeaveType_Update) |

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_Event_History_Save.sql`:
1. Accept the declared parameters and run the procedure or function body.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `tLeaveEventDetails` | read or write |
| `tLeaveEventDetails_History` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_LA_LeaveType_Event_History_Save] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
