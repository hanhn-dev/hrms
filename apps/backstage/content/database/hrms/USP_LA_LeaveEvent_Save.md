---
object: USP_LA_LeaveEvent_Save
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveEvent_Save.sql
last-analyzed: 2026-11-09
---

# USP_LA_LeaveEvent_Save

## What it does

Saves an event leave rule; may file admin approval or write policy rows for event leave.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveTransactionId` | in | `INT` |
| `@EmployerID` | in | `INT` |
| `@PolicyName` | in | `VARCHAR(200)` |
| `@IsStandardPolicy` | in | `BIT` |
| `@EffectiveFrom` | in | `DATE` |
| `@EffectiveTo` | in | `DATE` |
| `@PolicyPriority` | in | `INT` |
| `@EventLeaveRuleConfigJson` | in | `NVARCHAR(MAX)` |
| `@RelationshipTierGridJson` | in | `NVARCHAR(MAX)` |
| `@ApplicabilityJson` | in | `NVARCHAR(MAX)` |
| `@EventLeaveRulePreferenceType` | in | `VARCHAR(20)` |
| `@CreatedBy` | in | `INT` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_LA_LeaveEvent_Save
  participant N0 as SP_AddAdminChanges
  participant N1 as USP_LA_LeaveType_Policy_Save
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_AddAdminChanges` | procedure | Called while this object runs | [SP_AddAdminChanges](/docs/database/hrms/SP_AddAdminChanges) |
| `USP_LA_LeaveType_Policy_Save` | procedure | Called while this object runs | [USP_LA_LeaveType_Policy_Save](/docs/database/hrms/USP_LA_LeaveType_Policy_Save) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_LA_LeaveEvent_Save.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TEventLeaveRuleConfig_ChangeApproval` | read or write |
| `TLeavePolicy_ChangeApproval` | read or write |
| `TLeavePolicyParameterValue_ChangeApproval` | read or write |
| `TModulePages` | read or write |
| `TPolicyPreference` | read or write |
| `TPolicyPreference_ChangeApproval` | read or write |
| `TWorkflowDetails` | read or write |
| `TWorkflowManagement` | read or write |

## Flow

```mermaid
flowchart TD
  Start[USP_LA_LeaveEvent_Save] --> Run[Apply the inputs]
  Run --> Child[SP_AddAdminChanges]
  Child --> Done[Return the result]
```
