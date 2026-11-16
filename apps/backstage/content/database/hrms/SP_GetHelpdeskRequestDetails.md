---
object: SP_GetHelpdeskRequestDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetHelpdeskRequestDetails.sql
last-analyzed: 2026-11-16
---

# SP_GetHelpdeskRequestDetails

## What it does

Loads one help-desk request detail datasets for ViewHelpdeskDetails and overdue view popups.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@HelpdeskRequestId` | in | Request id |
| `@EmployeeId` | in | Context employee |

## Call sequence

Calls nested procedures listed under Nested when present; otherwise runs inline SQL only.

## Callers

| Object | Kind |
|---|---|
| `HelpDeskDAL.GetHelpdeskRequestDetails` | procedure |

## Nested

Calls no other procedures or functions.

## Steps

1. SELECT request header and related detail result sets for the popup.

## Tables

| Table | Read or write |
|---|---|
| `THelpDesk` | read |

## Unresolved calls

None noted for this feature pass.

## Flow

```mermaid
flowchart TD
  Start[SP_GetHelpdeskRequestDetails] --> Sel[SELECT detail datasets]
```
