---
object: SP_PMS_GETPMSAssessmentReportRequestData
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_PMS_GETPMSAssessmentReportRequestData.sql
last-analyzed: 2026-11-09
---

# SP_PMS_GETPMSAssessmentReportRequestData

## What it does

Lists Assessment Report export requests for one employer, newest first, with cycle name, employer name, encrypted requester display name plus employment number, status, assessment type, and `FilePath`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer whose request rows are returned |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_PMS_GETPMSAssessmentReportRequestData
  participant Name as Fn_GetEmployeeName
  participant Enc as Fn_EncryptData
  Caller->>Main: execute
  Main->>Name: requester display name
  Main->>Enc: wrap name for EmployeeName column
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | build requester name | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `Fn_EncryptData` | function | wrap requester name in result | [Fn_EncryptData](/docs/database/hrms/Fn_EncryptData) |

## Steps

1. Select from `TPMSAssessmentReportRequestData` where `EmployerId = @EmployerId`.

2. Resolve `CycleName` from `TPMSAppraisalCycles` and `EmployerName` from `TPMSEmployerConfiguration`.

3. Build `EmployeeName` as encrypted `Fn_GetEmployeeName(RequestedBy)` plus employment number from `TEmployeeInfo`.

4. Return `ReportRequestDataId`, cycle/employer fields, `RequestedBy`, `CreatedDate`, `Status`, `AssessmentType`, `FilePath`, ordered by id descending.

## Tables

| Table | Read or write |
|---|---|
| `TPMSAssessmentReportRequestData` | read |
| `TPMSAppraisalCycles` | read |
| `TPMSEmployerConfiguration` | read |
| `TEmployeeInfo` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_PMS_GETPMSAssessmentReportRequestData] --> Sel[Select requests for employer]
  Sel --> Names[Attach cycle employer and requester names]
  Names --> Ret[Return newest first]
```
