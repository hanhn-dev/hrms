---
object: USP_LA_InsertLeave_CompOffDate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_InsertLeave_CompOffDate.sql
last-analyzed: 2026-11-16
---

# USP_LA_InsertLeave_CompOffDate

## What it does

Persists day-based comp-off worked-on dates linked to a newly inserted leave request (`@LeaveRequestId`).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveRequestId` | in | New `TLeaveRequest.TransId` |
| Comp-off date TVP / related inputs | in | See script |

## Call sequence

```mermaid
sequenceDiagram
  participant Parent as USP_LA_InsertLeaveRequestDetails
  participant Main as USP_LA_InsertLeave_CompOffDate
  Parent->>Main: LeaveRequestId
  Main->>Main: insert comp-off date rows
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_LA_InsertLeaveRequestDetails` | procedure | [USP_LA_InsertLeaveRequestDetails](/docs/database/hrms/USP_LA_InsertLeaveRequestDetails) |

## Nested

No further procedure EXECs on the common path.

## Steps

1. Accept leave request id and comp-off dates from parent.
2. Insert day-based comp-off association rows.

## Tables

| Table | Read or write |
|---|---|
| Comp-off date association table(s) | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_LA_InsertLeave_CompOffDate] --> Ins[Insert day-based comp-off dates]
  Ins --> Done[Return to parent]
```
