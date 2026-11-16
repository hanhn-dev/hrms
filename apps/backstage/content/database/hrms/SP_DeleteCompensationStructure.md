---
object: SP_DeleteCompensationStructure
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_DeleteCompensationStructure.sql
last-analyzed: 2026-11-09
---

# SP_DeleteCompensationStructure

## What it does

Hard-deletes one compensation structure row for an employer.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@employerId` | in | Employer scope |
| `@CompensationStructureId` | in | Structure to delete |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. DELETE from TCompensationStructure where Employerid and CompensationStructureId match.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCompensationStructure` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_DeleteCompensationStructure] --> Work[Run the statements in Steps]
  Work --> Done[Return]
```
