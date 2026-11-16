---
object: Sp_AdminPMS_UpdCompetency
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_UpdCompetency.sql
last-analyzed: 2026-11-06
---

# Sp_AdminPMS_UpdCompetency

## What it does

Updates a competency name, description, and active flag when the new name does not collide.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@CompetencyId` | in | Competency Id |
| `@CompetencyName` | in | Competency Name |
| `@CompetencyDescription` | in | Competency Description |
| `@EmployerId` | in | Employer Id |
| `@IsActive` | in | Is Active |
| `@ModifiedBy` | in | Modified By |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminPMS_UpdCompetency.sql`.

1. If (Select count(1) From TPMSCompetencyMaster Where EmployerId=@EmployerId And Upper(CompetencyName)=Upper(@CompetencyName)And CompetencyId<>@CompetencyId And IsDeleted=0)>0
2. Select 0 ErrorCode
3. Update TPMSCompetencyMaster
4. Select 1 ErrorCode

## Tables

| Table | Read or write |
|---|---|
| `TPMSCompetencyMaster` | read/write |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminPMS_UpdCompetency] --> Body[Run the script body]
  Body --> Write[Write TPMSCompetencyMaster]
```
