---
object: SP_GetPendingOfferRolledOut
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetPendingOfferRolledOut.sql
last-analyzed: 2026-11-09
---

# SP_GetPendingOfferRolledOut

## What it does

Returns Offer Rolled Out candidates that have a pending DirectCandidate workflow row for the given employee (approver). Joins `TMAddCandidate` to `TRequestWorkflows` where `RequestType = 'DirectCandidate'`, `ManagerId = @EmployeeId`, and `ApproveStatus = 'P'`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployeeId` | in | Approver whose pending rows are returned |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetPendingOfferRolledOut
  participant Open as Sp_OpenEncryptionKeys
  participant Close as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Open: before select
  Main->>Close: after select
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | before the select | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | after the select | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |
| `DecryptSql` | function | AnnualCTC column | [DecryptSql](/docs/database/hrms/DecryptSql) |

## Steps

1. Open encryption keys.
2. Select candidate columns from `TMAddCandidate` joined to pending `TRequestWorkflows` for `DirectCandidate` and `@EmployeeId`.
3. Close encryption keys.

## Tables

| Table | Read or write |
|---|---|
| `TMAddCandidate` | read |
| `TRequestWorkflows` | read |
| `TTitle` | read |
| `TLocation` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_GetPendingOfferRolledOut] --> Open[Open encryption keys]
  Open --> Join[Join TMAddCandidate to pending TRequestWorkflows]
  Join --> Close[Close encryption keys]
```
