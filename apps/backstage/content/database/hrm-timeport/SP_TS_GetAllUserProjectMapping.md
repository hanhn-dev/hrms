---
object: SP_TS_GetAllUserProjectMapping
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_TS_GetAllUserProjectMapping.sql
last-analyzed: 2026-11-16
---

# SP_TS_GetAllUserProjectMapping

## What it does

Returns resource-mapping rows for an employer with optional filters on clients, employees, project configs, allocation dates, and timesheet approvers. Opens encryption keys for name fields.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerID` | in | Employer id |
| `@EmployeeID` | in | Login employee id |
| `@ClientIds` | in | Optional client ids |
| `@Employees` | in | Optional employee ids |
| `@ProjectConfigIds` | in | Optional project config ids |
| `@AllocationStartDate` | in | Optional start filter |
| `@AllocationEndDate` | in | Optional end filter |
| `@TimesheetApprovers` | in | Optional approver ids |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TS_GetAllUserProjectMapping
  participant N_Sp_OpenEncryptionKeys as Sp_OpenEncryptionKeys
  Caller->>Main: execute
  Main->>N_Sp_OpenEncryptionKeys: execute
```

## Callers

Application only. timeportDAL.GetAllUserProjectMapping.

## Nested

| Object | Kind | Page |
|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_TS_GetAllUserProjectMapping.sql`:

1. EXEC Sp_OpenEncryptionKeys.
2. SELECT mapping rows with project, client, and employee labels.
3. Apply optional filters.

## Tables

| Table | Read or write |
|---|---|
| `TTSUserProjectMapping` | read |
| `TTSProjectConfiguration` | read |
| `TEmployee` | read |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[SP_TS_GetAllUserProjectMapping] --> S0
  S0["EXEC Sp_OpenEncryptionKeys."]
  S1["SELECT mapping rows with project, client, and employee label"]
  S2["Apply optional filters."]
  S0 --> S1
  S1 --> S2
  S2 --> Done[Return]
```
