---
object: Sp_RA_GetEmployerName
kind: procedure
database: hrms-resourceallocation
source: HRMS-DATABASE/HRMS-RESOURCEALLOCATION/STOREPROCEDURE/Sp_RA_GetEmployerName.sql
last-analyzed: 2026-11-16
---

# Sp_RA_GetEmployerName

## What it does

Returns `EmployerName` from `TEmployerDetails` for one employer where not deleted.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerId` | in | Employer id |

## Call sequence

Calls no other procedures or functions.

## Callers

Application caller: raDAL.GetEmployerName from [Manage Allocation](/docs/guides/resource-allocation/manage-allocation).

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS-RESOURCEALLOCATION/STOREPROCEDURE/Sp_RA_GetEmployerName.sql`.
2. Returns `EmployerName` from `TEmployerDetails` for one employer where not deleted.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployerDetails` | read (synonym) |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[Sp_RA_GetEmployerName] --> Work[Read or write]
  Work --> EndNode[Return]
```
