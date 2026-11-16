---
object: USP_LA_LeaveType_Policy_Save
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_Policy_Save.sql
last-analyzed: 2026-11-09
---

# USP_LA_LeaveType_Policy_Save

## What it does

Nested save of leave policy JSON for a leave type.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeavePolicyJson` | in | `NVARCHAR(MAX)` |
| `@LeavePolicyParameterValueJson` | in | `NVARCHAR(MAX)` |
| `@LLCFConfigDetailsJson` | in | `NVARCHAR(MAX)` |
| `@UserID` | in | `INT` |
| `@RequestInitiatedBy` | in | `INT` |
| `@EventLeaveRuleConfigJson` | in | `NVARCHAR(MAX)` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_LA_LeaveType_Policy_Save
  participant N0 as USP_LA_LeaveType_Policy_LLCF_Save
  participant N1 as USP_LA_LeaveType_Policy_EventLeaveRule_Save
  participant N2 as USP_LA_LeaveType_Policy_History_Save
  participant N3 as USP_LA_LeaveType_Policy_LapseDate_Refresh
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
  Main->>N3: call
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `USP_LA_LeaveEvent_Approve` | procedure | No page yet |
| `USP_LA_LeaveEvent_Save` | procedure | [USP_LA_LeaveEvent_Save](/docs/database/hrms/USP_LA_LeaveEvent_Save) |
| `USP_LA_LeaveType_Approve` | procedure | No page yet |
| `USP_LA_LeaveType_Save` | procedure | [USP_LA_LeaveType_Save](/docs/database/hrms/USP_LA_LeaveType_Save) |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_LA_LeaveType_Policy_LLCF_Save` | procedure | Called while this object runs | No page yet |
| `USP_LA_LeaveType_Policy_EventLeaveRule_Save` | procedure | Called while this object runs | No page yet |
| `USP_LA_LeaveType_Policy_History_Save` | procedure | Called while this object runs | No page yet |
| `USP_LA_LeaveType_Policy_LapseDate_Refresh` | procedure | Called while this object runs | No page yet |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveType_Policy_Save.sql`:
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
  Start[USP_LA_LeaveType_Policy_Save] --> Run[Apply the inputs]
  Run --> Child[USP_LA_LeaveType_Policy_LLCF_Save]
  Child --> Done[Return the result]
```
