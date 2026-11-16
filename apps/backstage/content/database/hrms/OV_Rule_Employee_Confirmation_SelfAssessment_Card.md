---
object: OV_Rule_Employee_Confirmation_SelfAssessment_Card
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_Rule_Employee_Confirmation_SelfAssessment_Card.sql
last-analyzed: 2026-11-16
---

# OV_Rule_Employee_Confirmation_SelfAssessment_Card

## What it does

Returns the Confirmation SelfAssessment View/Edit card for one employee: overdue confirmation assessments past the working-day deadline, with points, managers, and exclude Param keys.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ModuleName` | in | Module label echoed on the result |
| `@CategoryName` | in | Category label echoed on the result |
| `@ActivityName` | in | Activity label echoed on the result |
| `@ActivityDescription` | in | Activity description echoed on the result |
| `@OccuranceVialoationMasterID` | in | Activity master id whose detail bands apply |
| `@EmployeeId` | in | Employee being scored or shown on the card |
| `@Employerid` | in | Employer scope |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as OV_Rule_Employee_Confirmation_SelfAssessment_Card
  participant N0 as Sp_OpenEncryptionKeysNew
  participant N1 as SP_CloseEncryptionKeyNew
  participant N2 as Fn_GetSpecificWorkingDay
  participant N3 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
  Main->>N3: call
```

## Callers

No other procedure or function calls this object. `ViolationsOccurrenceDAL` card handlers in Core API execute it for Violations & Occurrence View/Edit.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeysNew` | procedure | Start of run (open keys for name decryption) | [Sp_OpenEncryptionKeysNew](/docs/database/hrms/Sp_OpenEncryptionKeysNew) |
| `SP_CloseEncryptionKeyNew` | procedure | End of run | [SP_CloseEncryptionKeyNew](/docs/database/hrms/SP_CloseEncryptionKeyNew) |
| `Fn_GetSpecificWorkingDay` | function | Deadline date from initiation + working days | No page yet |
| `Fn_GetEmployeeName` | function | Final select for employee / manager names | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_Rule_Employee_Confirmation_SelfAssessment_Card.sql`, set `NOCOUNT` and `READ UNCOMMITTED`.
2. `EXEC` Sp_OpenEncryptionKeysNew.
3. Load `@EffectiveDtm` from `OccuranceVialoationActivityMaster` for `@OccuranceVialoationMasterID`.
4. Build category-specific hit rows for `@EmployeeId` / `@Employerid` after the effective date (and apply exclude filters where the script does).
5. Match hits to `OccuranceVialoationActivityDetail` condition operators (Below / Between / Above / Equal).
6. Select condition band metadata and the enriched card grid (BU, names via `Fn_GetEmployeeName`, points, Param1-3 / ParamType).
7. `EXEC` SP_CloseEncryptionKeyNew.

## Tables

| Table | Read or write |
|---|---|
| `dbo.OccuranceVialoationActivityDetail` | read |
| `dbo.OccuranceVialoationActivityMaster` | read |
| `dbo.OccuranceVialoationExclude` | read |
| `dbo.TCMSEmployeeConfirmation` | read |
| `dbo.TEmployee` | read |
| `dbo.TEmployeeInfo` | read |
| `dbo.TORGChart` | read |
| `dbo.TOrgHierarchyDetails` | read |

## Flow

```mermaid
flowchart TD
  Start["OV_Rule_Employee_Confirmation_SelfAssessment_Card"]
  Keys["Open encryption keys"]
  Load["Load effective date and hits"]
  Match["Match condition bands"]
  Out["Return card result sets"]
  Close["Close encryption keys"]
  Start --> Keys
  Keys --> Load
  Load --> Match
  Match --> Out
  Out --> Close
```
