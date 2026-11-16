---
object: Sp_InsRoleTabDetail
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_InsRoleTabDetail.sql
last-analyzed: 2026-11-09
---

# Sp_InsRoleTabDetail

## What it does

Grants a role access to one tab on one menu for one employer, if that grant does not already exist. When it inserts, it also writes an insert history row to `TRoleTabDetailsHistory` with `ActionType` `I` and `IsEditable` `Y`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RoleId` | in | Role receiving the tab |
| `@MenuId` | in | Menu (page) that owns the tab |
| `@TabId` | in | Base-organisation tab id |
| `@EmployerId` | in | Employer for the grant |
| `@CreatedBy` | in | Actor stamped on the live and history rows |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_InsRoleTabDetail
  Caller->>Main: execute
  alt row already exists
    Main-->>Caller: no insert
  else missing
    Main->>Main: insert TRoleTabDetails
    Main->>Main: insert TRoleTabDetailsHistory ActionType I
  end
```

## Callers

No other procedure or function calls this object. `MenuManagerDAL.insertRoleTabDetailIfMissing` executes it from Tab Manager save (`POST /api/menuManagement/tabAccess`).

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_InsRoleTabDetail.sql`, check `TRoleTabDetails` for an existing row on `@RoleId`, `@MenuId`, `@TabId`, and `@EmployerId`.
2. When none exists, compute the next `TransId` as `max(TransId)+1` from `TRoleTabDetailsHistory`.
3. Insert `TRoleTabDetails` with `IsEditable` `Y`, `@CreatedBy`, and today's date.
4. Insert matching `TRoleTabDetailsHistory` with `ActionType` `I`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRoleTabDetails` | read, write |
| `dbo.TRoleTabDetailsHistory` | read, write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[Sp_InsRoleTabDetail] --> Exists{Grant already present}
  Exists -->|yes| Stop[No change]
  Exists -->|no| Ins[Insert TRoleTabDetails]
  Ins --> Hist[Insert history ActionType I]
```
