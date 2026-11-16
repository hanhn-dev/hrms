---
object: USP_WM_CancelHandoffBatch
kind: procedure
database: hrm-timeport
source: live HRM_CL_TIMEPORT (not inventoried under HRMS-DATABASE/HRM-TIMEPORT)
last-analyzed: 2026-11-16
---

# USP_WM_CancelHandoffBatch

## What it does

Sender-side withdrawal of a **Pending** HTB (Stage Approvals Outgoing). Sets status **Cancelled**, writes `TWM_StageTransitionLog`, and does not change task stages (same unlock effect as reject). Authorized for the batch initiator or a sending-BU manager with `AllowStagePromotion`. Comment is optional. Feature-flag gated like other HTB writes.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@HTBGuid` | in | Batch public id |
| `@Comment` | in | Optional cancel comment |
| `@ActorEmployeeID` | in | Cancelling employee |
| `@ActorBUID` | in | Caller’s asserted org BU |
| `@EmployerID` | in | Tenant employer |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_CancelHandoffBatch
  participant Gate as UFN_WM_IsHandoffEnabled
  Caller->>Main: HTBGuid Comment actor
  Main->>Gate: EmployerID
  alt disabled
    Main-->>Caller: ERR_FEATURE_DISABLED
  else authorized Pending
    Main->>Main: Status Cancelled
    Main->>Main: Insert StageTransitionLog Cancelled
    Main-->>Caller: OK
  end
```

## Callers

Work Management API cancel path used by Stage Approvals Outgoing (controller not in SourceCode checkout).

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `UFN_WM_IsHandoffEnabled` | function | Before any write | [UFN_WM_IsHandoffEnabled](/docs/database/hrm-timeport/UFN_WM_IsHandoffEnabled) |

## Steps

1. Definition lives in live DEV `HRM_CL_TIMEPORT` (no Liquibase script in this checkout).
2. Abort when handoff feature is off.
3. Lock batch by `HTBGuid` + `EmployerID`; require `Pending`.
4. Authorize initiator **or** (`@ActorBUID = FromBUID` and `AllowStagePromotion`).
5. Set `Status = Cancelled` with decision audit columns.
6. Insert `TWM_StageTransitionLog` event `Cancelled`; return `OK`.

## Tables

| Table | Read or write |
|---|---|
| `TWM_HandoffBatch` | read/write |
| `TWM_HandoffBatchTask` | read |
| `TWM_StageTransitionLog` | write |
| `TWM_TAccessGroupMembers` | read |
| `TWM_TAccessGroupPermissions` | read |

## Flow

```mermaid
flowchart TD
  Start["USP_WM_CancelHandoffBatch"] --> Gate{"Handoff enabled"}
  Gate -->|no| ErrOff["ERR_FEATURE_DISABLED"]
  Gate -->|yes| Pend["Pending batch lock"]
  Pend --> Auth{"Initiator or AllowStagePromotion"}
  Auth -->|no| ErrAuth["ERR_NOT_AUTHORIZED"]
  Auth -->|yes| Canc["Status Cancelled"]
  Canc --> Log["StageTransitionLog Cancelled"]
```
