---
object: USP_Leave_Policy_Save
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_Leave_Policy_Save.sql
last-analyzed: 2026-11-09
---

# USP_Leave_Policy_Save

## What it does

Legacy leave-policy UDT save nested from `SP_AdminLM_AddNewLeaveType`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@UDT_LeavePolicy` | in | `UDT_LeavePolicy` |
| `@UDT_LeavePolicy_ParameterValue` | in | `UDT_LeavePolicy_ParameterValue` |
| `@UDT_LLCF_ConfigDetails` | in | `UDT_LLCF_ConfigDetails` |
| `@UserID` | in | `INT` |
| `@RequestInitiatedBy` | in | `INT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_Leave_Policy_Save
  participant N0 as USP_LP_Config_LLCF_Save
  participant N1 as USP_Leave_Policy_History_Save
  participant N2 as USP_LA_LeaveType_Policy_LapseDate_Refresh
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_LP_Config_LLCF_Save` | procedure | Called while this object runs | No page yet |
| `USP_Leave_Policy_History_Save` | procedure | Called while this object runs | No page yet |
| `USP_LA_LeaveType_Policy_LapseDate_Refresh` | procedure | Called while this object runs | No page yet |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_Leave_Policy_Save.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TLeavePolicy` | read or write |
| `TLeavePolicyParameter` | read or write |
| `TLeavePolicyParameterValue` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_Leave_Policy_Save] --> Run[Apply the inputs]
  Run --> Child[USP_LP_Config_LLCF_Save]
  Child --> Done[Return the result]
```
