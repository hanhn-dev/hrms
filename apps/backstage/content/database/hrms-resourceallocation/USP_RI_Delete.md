---
object: USP_RI_Delete
kind: procedure
database: hrms-resourceallocation
source: HRMS-DATABASE/HRMS-RESOURCEALLOCATION/STOREPROCEDURE/USP_RI_Delete.sql
last-analyzed: 2026-11-16
---

# USP_RI_Delete

## What it does

Soft-deletes a reallocation initiate (`IsDeleted = 1`, status `Deleted`) and inserts a status-history row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ReallocationInitiateID` | in | Request id |
| `@EmployeeID / @EmployerID / @UpdatedBy` | in | Actors |

## Call sequence

Calls no other procedures (inline history insert).

## Callers

Application caller: RA WebAPI `raDAL` from [Manage Allocation](/docs/guides/resource-allocation/manage-allocation) Initiate Reallocation / Notifications.

## Nested

Calls no other procedures (inline history insert).

## Steps

1. Script is `HRMS-DATABASE/HRMS-RESOURCEALLOCATION/STOREPROCEDURE/USP_RI_Delete.sql`.
2. Soft-deletes a reallocation initiate (`IsDeleted = 1`, status `Deleted`) and inserts a status-history row.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TReallocationInitiate` | write |
| `dbo.TReallocationInitiateStatusHistory` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_RI_Delete] --> Work[Execute body]
  Work --> EndNode[Return]
```
