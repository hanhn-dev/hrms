---
object: USP_HRMS_Module_List
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_HRMS_Module_List.sql
last-analyzed: 2026-11-09
---

# USP_HRMS_Module_List

## What it does

Returns distinct active rows from `THrmsModules` (`ModuleId`, `ModuleName`, `IsDefault`) ordered by name for the licence module multi-select.

## Parameters

None.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_HRMS_Module_List
  Caller->>Main: execute
  Main-->>Caller: active modules
```

## Callers

No other procedure calls this object. `dashBoardDAL.GetModuleList` executes it from Manage Licenses.

## Nested

None.

## Steps

1. Select distinct active `THrmsModules` rows ordered by `ModuleName`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.THrmsModules` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["USP_HRMS_Module_List"] --> Out["Select active modules"]
```
