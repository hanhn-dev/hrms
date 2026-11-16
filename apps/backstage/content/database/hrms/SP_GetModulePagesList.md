---
object: SP_GetModulePagesList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetModulePagesList.sql
last-analyzed: 2026-11-16
---

# SP_GetModulePagesList

## What it does

Returns every row from `TModulePages` with the parent module name resolved from `THrmsModules`. Used by the Access Rights Management API’s module-pages catalog endpoint.

## Parameters

None.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetModulePagesList
  Caller->>Main: execute
  Main->>Main: SELECT TModulePages with THrmsModules name
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. Application caller: Core Node `AccessRightsManagementDAL.getModulePagesList` via `GET /api/accessRightsManagement/modulePages` (BLL currently mis-cases the DAL method name).

## Nested

Calls no other procedures or functions.

## Steps

1. Select `ModulePageId`, `ModulePageName`, scalar `ModuleName` from `THrmsModules` where `ModuleId = PageModuleID` as `PageModuleName`, `MappedAppPage`, and `Pagemoduleid` from `TModulePages`.

2. Order by `ModulePageId ASC`.

## Tables

| Table | Read or write |
|---|---|
| `TModulePages` | read |
| `THrmsModules` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_GetModulePagesList] --> Pages[Read TModulePages]
  Pages --> Name[Resolve PageModuleName from THrmsModules]
  Name --> Ret[Return ordered rows]
```
