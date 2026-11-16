---
object: Sp_PMS_GetEmployeeGoalFormAllUpdates
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetEmployeeGoalFormAllUpdates.sql
last-analyzed: 2026-11-09
---

# Sp_PMS_GetEmployeeGoalFormAllUpdates

## What it does

Builds the “See all updates” timeline for one goal form mapping: goal initiated, employee submitted, pending/approved levels for `EmployeeGoalSetting` workflows, and employee acknowledged.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@GoalMappingId` | in | `TPMSEmployeeGoalMapping.GoalMappingId` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_PMS_GetEmployeeGoalFormAllUpdates
  participant Open as Sp_OpenEncryptionKeys
  participant Name as Fn_GetEmployeeName
  participant Close as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Open: open keys
  Main->>Name: format names
  Main->>Close: close keys
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | start | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `Fn_GetEmployeeName` | function | name formatting | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |
| `SP_CloseEncryptionKey` | procedure | end | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

Script: `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_PMS_GetEmployeeGoalFormAllUpdates.sql`.

1. Open encryption keys.
2. Union goal-initiated, employee-submitted, workflow pending/approved, and acknowledged events into `@lv_SeeAllUpdates` for `requesttype = 'EmployeeGoalSetting'`.
3. Collapse and return rows grouped by date and status.
4. Close encryption keys.

## Tables

| Table | Read or write |
|---|---|
| `TPMSEmployeeGoalMapping` | read |
| `TEmployeeInfo` | read |
| `TPMSEmployerConfiguration` | read |
| `TRequestWorkflows` | read |
| `TEmailNotification` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_PMS_GetEmployeeGoalFormAllUpdates] --> Keys[Open keys]
  Keys --> Build[Union goal timeline]
  Build --> Collapse[Group by date and status]
  Collapse --> Close[Close keys]
```
