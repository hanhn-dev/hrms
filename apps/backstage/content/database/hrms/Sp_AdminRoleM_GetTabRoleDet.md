---
object: Sp_AdminRoleM_GetTabRoleDet
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminRoleM_GetTabRoleDet.sql
last-analyzed: 2026-11-06
---

# Sp_AdminRoleM_GetTabRoleDet

## What it does

Returns every tab the role may open, for every menu. The attendance card then keeps the rows for menu 1173 to decide leave, AR, WFH, and OD actions.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employer that owns the data (`Int`) |
| `@RoleId` | in | Role whose tab grants are loaded (`Int`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_AdminRoleM_GetTabRoleDet
  Caller->>Main: execute
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminRoleM_GetTabRoleDet.sql`:

1. Returns every tab the role may open, for every menu.
2. The attendance card then keeps the rows for menu 1173 to decide leave, AR, WFH, and OD actions.

## Tables

| Table | Read or write |
|---|---|
| `TRoleTabDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminRoleM_GetTabRoleDet] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
