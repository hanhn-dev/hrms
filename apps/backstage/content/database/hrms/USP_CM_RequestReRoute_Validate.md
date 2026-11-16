---
object: USP_CM_RequestReRoute_Validate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CM_RequestReRoute_Validate.sql
last-analyzed: 2026-11-16
---

# USP_CM_RequestReRoute_Validate

## What it does

Validates that pending request trans ids can be reassigned to `@ReRouteEmployeeid` for the given `@RequestType` before `SP_CM_RequestReRoute` updates managers.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TransIds` | in | Request trans id list |
| `@ReRouteEmployeeid` | in | Target manager |
| `@RequestType` | in | Workflow request type |

## Call sequence

```mermaid
sequenceDiagram
  participant Parent as SP_CM_RequestReRoute
  participant Main as USP_CM_RequestReRoute_Validate
  Parent->>Main: TransIds and new manager
  Main->>Main: eligibility checks
  Main-->>Parent: validation result
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_CM_RequestReRoute` | procedure | [SP_CM_RequestReRoute](/docs/database/hrms/SP_CM_RequestReRoute) |

## Nested

No further procedure EXECs required for this one-level page.

## Steps

1. Parse `@TransIds`.
2. Ensure each pending row may be handed to `@ReRouteEmployeeid` for `@RequestType`.

## Tables

| Table | Read or write |
|---|---|
| `TRequestWorkflows` | read |
| Employee / eligibility tables | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_CM_RequestReRoute_Validate] --> Check[Check each TransId]
  Check --> Done[Return validity to parent]
```
