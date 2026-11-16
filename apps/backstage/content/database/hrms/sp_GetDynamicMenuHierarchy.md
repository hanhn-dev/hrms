---
object: sp_GetDynamicMenuHierarchy
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/sp_GetDynamicMenuHierarchy.sql
last-analyzed: 2026-11-09
---

# sp_GetDynamicMenuHierarchy

## What it does

Returns the dynamic left-nav XML for one employer. When that employer has no `TDynamicMenuHierarchy` row, it returns the base organisation row (`Employerid` 0) instead.

Menu Manager always calls it with `EmployerId` 0 to load the editable base tree. Apply-only also uses it to read the base XML before copying to other organisations.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employer whose menu XML to read |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as sp_GetDynamicMenuHierarchy
  Caller->>Main: execute with Employerid
  alt no rows for that employer
    Main-->>Caller: DynamicMenuXML from Employerid 0
  else employer has a row
    Main-->>Caller: DynamicMenuXML for that employer
  end
```

## Callers

No other procedure or function calls this object. `MenuManagerDAL.fetchOrganizationMenuTree` executes it for Menu Manager (`GET /api/menuManagement/baseOrganizationMenuTree` and apply-only copy).

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/sp_GetDynamicMenuHierarchy.sql`, count `TDynamicMenuHierarchy` rows for `@Employerid`.
2. When the count is 0, select `DynamicMenuXML` and `Transid` where `Employerid` is 0.
3. Otherwise select `DynamicMenuXML` and `Transid` where `employerid` equals `@Employerid`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TDynamicMenuHierarchy` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[sp_GetDynamicMenuHierarchy] --> Count{Rows for Employerid}
  Count -->|zero| Base[Return Employerid 0 XML]
  Count -->|one or more| Own[Return that employer XML]
```
