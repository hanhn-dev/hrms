---
object: Sp_AdminPMS_GetAllCompetency
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAllCompetency.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_GetAllCompetency

## What it does

Lists competency dictionary rows for an employer. `@ActiveType` chooses active, inactive, or both.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer Id |
| `@ActiveType` | in | Active Type |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_GetAllCompetency.sql`.

1. If @ActiveType='A'
2. Select CompetencyId,
3. Else If @ActiveType='B'
4. Select CompetencyId,

## Tables

| Table | Read or write |
|---|---|
| `TPMSCompetencyMaster` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_GetAllCompetency] --> Body[Run the script body]
```
