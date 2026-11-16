---
object: Sp_Mydetails_Enhanced_Getfilters
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_Mydetails_Enhanced_Getfilters.sql
last-analyzed: 2026-11-09
---

# Sp_Mydetails_Enhanced_Getfilters

## What it does

Returns saved advanced filters for one employer that the employee may see: filters they created, plus other users’ public filters that are not deleted.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |
| `@EmployeeId` | in | Logged-in employee (owner or public viewer) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_Mydetails_Enhanced_Getfilters
  participant DB as Database
  Caller->>Main: execute
  Main->>DB: select owned and public filters
```

## Callers

Application caller: New Look Search Employee via `teamMemberSavedFilters.getTeamMemberSavedFilters` → TeamMembers saved-filters API.

## Nested

None.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_Mydetails_Enhanced_Getfilters.sql`.
2. Select non-deleted filters created by `@EmployeeId` for `@EmployerId`.
3. Union non-deleted public filters created by others for the same employer.

## Tables

| Table | Read or write |
|---|---|
| `dbo.Mydetails_Enhanced_Advancedfilters` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_Mydetails_Enhanced_Getfilters] --> Own[Owned filters]
  Own --> Public[Public filters from others]
  Public --> Ret[Return union]
```
