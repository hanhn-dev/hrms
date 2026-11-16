---
object: Sp_AdminRM_DeleteRecruitmentAdminMaster
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminRM_DeleteRecruitmentAdminMaster.sql
last-analyzed: 2026-11-06
---

# Sp_AdminRM_DeleteRecruitmentAdminMaster

## What it does

Soft-deletes one recruitment admin by setting `IsDeleted` to `Y` and `IsActive` to 0. The delete is refused when that employee still owns a candidate mapping in a hiring or offer status. The procedure returns the employee name and `Code` 1 or 0.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RecruitmentAdminId` | in | Row to mark deleted |
| `@EmployeeId` | in | Employee checked against candidate mappings |
| `@Updatedby` | in | Actor |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_AdminRM_DeleteRecruitmentAdminMaster
  participant Name as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>Name: employee display name
```

## Callers

No other procedure or function calls this object.

`recruitmentDAL.DeleteRecruitmentAdminMasterData` calls it from Recruitment Management.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | on both return paths | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. Count `TRRSCandidateMapping` rows for `@EmployeeId` joined to the same hiring and offer status descriptions used by the insert procedure (`Sp_AdminRM_DeleteRecruitmentAdminMaster.sql`).
2. When the count is greater than 0, return `Code` 0.
3. Otherwise update `TRecruitmentAdminMaster` for `@RecruitmentAdminId` and return `Code` 1.

## Tables

| Table | Read or write |
|---|---|
| `TRRSCandidateMapping` | read |
| `tref_candidate_status` | read |
| `TRecruitmentAdminMaster` | write |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminRM_DeleteRecruitmentAdminMaster] --> Busy{In-flight candidate mapping}
  Busy -->|yes| Block[Return code 0]
  Busy -->|no| Del[Set IsDeleted to Y]
  Del --> Ok[Return code 1]
```
