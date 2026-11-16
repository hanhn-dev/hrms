---
object: SP_DeleteCompensationAnnexure
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_DeleteCompensationAnnexure.sql
last-analyzed: 2026-11-09
---

# SP_DeleteCompensationAnnexure

## What it does

Hard-deletes one CompensationAnnexure row for an employer.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@employerId` | in | Employer scope |
| `@AnnexureId` | in | Annexure to delete |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. DELETE from CompensationAnnexure where Employerid and AnnexureId match.

## Tables

| Table | Read or write |
|---|---|
| `dbo.CompensationAnnexure` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_DeleteCompensationAnnexure] --> Work[Run the statements in Steps]
  Work --> Done[Return]
```
