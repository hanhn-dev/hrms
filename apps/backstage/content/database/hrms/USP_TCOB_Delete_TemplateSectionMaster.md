---
object: USP_TCOB_Delete_TemplateSectionMaster
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TCOB_Delete_TemplateSectionMaster.sql
last-analyzed: 2026-11-16
---

# USP_TCOB_Delete_TemplateSectionMaster

## What it does

Soft-deactivates one Config Manager sheet by setting `IsActive = 0` on an active `TCOB_TemplateSectionMaster` row. No-op when the sheet is already inactive or missing.

## Parameters

| Name | Type | Direction | Default | Meaning |
|---|---|---|---|---|
| `@TemplateSectionID` | INT | in | — | Sheet to deactivate |
| `@EmployeeID` | INT | in | NULL | Audit user |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TCOB_Delete_TemplateSectionMaster
  Caller->>Main: execute
  Main->>Main: soft-deactivate active sheet if present
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App caller: `ClientOnboardingDAL.deleteTCOBTemplateSectionMaster` from Config Manager (`POST /api/clientonboard2/cfg/deleteTemplateSectionMaster`).

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| *(none)* | — | — | — |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TCOB_Delete_TemplateSectionMaster.sql`.
2. If an active sheet exists for `@TemplateSectionID`, set `IsActive = 0` and audit columns.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCOB_TemplateSectionMaster` | read + write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["USP_TCOB_Delete_TemplateSectionMaster"] --> Active{"Active sheet?"}
  Active -->|yes| Soft["IsActive 0"]
  Active -->|no| Skip["No-op"]
```
