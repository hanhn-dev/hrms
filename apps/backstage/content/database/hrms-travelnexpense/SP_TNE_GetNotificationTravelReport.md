---
object: SP_TNE_GetNotificationTravelReport
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_GetNotificationTravelReport.sql
last-analyzed: 2026-11-16
---

# SP_TNE_GetNotificationTravelReport

## What it does

Notifications inbox for pending **travel report** workflow approvals for `@pEmployeeId`. Used after a travel report is submitted so the report approver sees the request in Notifications.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id, CSV, or `-1` |
| `@pEmployeeId` | in | Approver employee id |
| `@showInactiveEmployees` | in | Include inactive employees when 1 |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TNE_GetNotificationTravelReport
  participant Nested as SP_GetGlobalAccessEmployerList
  Caller->>Main: execute
  opt employer is -1
    Main->>Nested: expand employers
  end
```

## Callers

| Caller | Page |
|---|---|
| `TravelDAL.GetNotificationTravelRequests` (report result set) | Travel Requests guide |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_GetGlobalAccessEmployerList` | procedure | `@pEmployerId = '-1'` | [SP_GetGlobalAccessEmployerList](/docs/database/hrms/SP_GetGlobalAccessEmployerList) |

## Steps

1. Resolve employer set and active/inactive filter.
2. Select travel requests with pending travel-report approval for the actor.
3. Project list columns including schedule date range from live schedules.

## Tables

| Table | Read or write |
|---|---|
| `TTRAVEL_REQUEST` | read |
| `TTRAVEL_SCHEDULE` | read |
| `TRequestWorkflows` / travel-report status tables used in script | read |
| `TLOOKUP` | read |
| `TEMPLOYEE` | read |

## Unresolved calls

None beyond the nested procedure above.

## Flow

```mermaid
flowchart TD
  Start[SP_TNE_GetNotificationTravelReport] --> Pending[Pending report approvals]
  Pending --> Done[Return report notification rows]
```
