---
object: SP_TNE_GetTeamTravelRequests
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_GetTeamTravelRequests.sql
last-analyzed: 2026-11-16
---

# SP_TNE_GetTeamTravelRequests

## What it does

Returns travel request grid rows for the **Team Requests** tab: requests for employees in the manager’s team (and optional employee/BU filters). Respects active/inactive employee toggle and the same date/status/work-type/client filters as My Requests.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LoginUserId` | in | Manager / actor employee id |
| `@pEmployeeId` | in | CSV of employee ids to filter, or all |
| `@pEmployerId` | in | Employer id, CSV, or `-1` |
| `@RequestStatus` | in | CSV of status lookup ids |
| `@StartDate` | in | Date window start |
| `@EndDate` | in | Date window end |
| `@BusinessUnit` | in | CSV of business unit ids |
| `@showInactiveEmployees` | in | Include inactive employees when 1 |
| `@WorkTypeId` | in | Optional work-type filter |
| `@ClientName` | in | Optional client-name filter |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TNE_GetTeamTravelRequests
  participant Nested as SP_GetGlobalAccessEmployerList
  Caller->>Main: execute
  opt employer is -1
    Main->>Nested: expand employers
  end
```

## Callers

| Caller | Page |
|---|---|
| `TravelDAL.GetTravelRequestsWithFilters` when `SelectedTab == 2` | Travel Requests guide |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_GetGlobalAccessEmployerList` | procedure | `@pEmployerId = '-1'` | [SP_GetGlobalAccessEmployerList](/docs/database/hrms/SP_GetGlobalAccessEmployerList) |

## Steps

1. Resolve active/inactive filter and employer set (including global access).
2. Restrict to team members of `@LoginUserId` with optional employee and BU CSV filters.
3. Project the same grid columns as other travel list procedures (dates, status, advance, flags).

## Tables

| Table | Read or write |
|---|---|
| `TTRAVEL_REQUEST` | read |
| `TTRAVEL_SCHEDULE` | read |
| `TTRAVEL_REQ_STATUS` | read |
| `TTRAVEL_REQ_ADVANCE` | read |
| `TLOOKUP` | read |
| `TEMPLOYEE` / `TEmployeeInfo` / `TOrgHierarchyDetails` | read |
| org-chart / functional-manager relationships used for team scope | read |

## Unresolved calls

None beyond the nested procedure above.

## Flow

```mermaid
flowchart TD
  Start[SP_TNE_GetTeamTravelRequests] --> Scope[Employer and team scope]
  Scope --> Filter[Apply employee BU status date filters]
  Filter --> Done[Return team grid rows]
```
