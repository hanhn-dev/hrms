---
object: SP_Advances_GetAllPayAdvanceRequestStatus
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_Advances_GetAllPayAdvanceRequestStatus.sql
last-analyzed: 2026-11-16
---

# SP_Advances_GetAllPayAdvanceRequestStatus

## What it does

Returns status filter options from `TLOOKUP` for the Advance Requests list, segregated by `@SelectedTab` (My `331`, Team `332`, All `333`, Pay `334`, else Notification). Renames some labels for the UI (for example Employee Submitted → Submitted; consolidates in-process / rejected level ids in the CASE expression for display).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer id for lookup rows |
| `@SelectedTab` | in | Tab id (`331`–`334` or other for notification) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Advances_GetAllPayAdvanceRequestStatus
  Caller->>Main: execute
  Note over Main: No nested calls
```

## Callers

| Caller | Page |
|---|---|
| `advanceModuleDAL.GetAllPayAdvanceRequestStatus` | Advance Requests guide |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| — | — | None | — |

## Steps

1. Branch on `@SelectedTab`.
2. Select the allowed `Lookup_ID` set for that tab from `TLOOKUP` for `@EmployerId`.
3. Apply display-label CASE overrides and return the list.

## Tables

| Table | Read or write |
|---|---|
| `TLOOKUP` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_Advances_GetAllPayAdvanceRequestStatus] --> Tab{SelectedTab}
  Tab -->|331 My| My[My status set]
  Tab -->|332 Team| Team[Team status set]
  Tab -->|333 All| All[All status set]
  Tab -->|334 Pay| Pay[Pay status set]
  Tab -->|else| Notif[Notification status set]
  My --> Done[Return Lookup_ID Lookup_Text]
  Team --> Done
  All --> Done
  Pay --> Done
  Notif --> Done
```
