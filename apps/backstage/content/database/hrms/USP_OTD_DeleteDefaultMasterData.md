---
object: USP_OTD_DeleteDefaultMasterData
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/159568/USP_OTD_DeleteDefaultMasterData.sql
last-analyzed: 2026-11-16
---

# USP_OTD_DeleteDefaultMasterData

## What it does

Hard-removes the one default master record whose `_rowId` equals `@DefaultMasterDataId` from the owning section's JSON array. `_rowId` is globally unique via the sequence, so the single-argument signature resolves to at most one element. Unknown id is a no-op (same as the prior soft-delete behaviour for missing ids).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@DefaultMasterDataId` | in | `_rowId` inside a section's `JsonData` array |
| `@UserId` | in | UpdatedBy on the section row |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_OTD_DeleteDefaultMasterData
  Caller->>Main: execute
  Main->>Main: rewrite TOTD_DefaultMasterData.JsonData
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. Application caller: Core Node `ClientOnboardingDAL.deleteDefaultMasterData` via `DELETE /api/clientonboard2/otd/defaultMasterData/:id`.

## Nested

Calls no other procedures or functions.

## Steps

1. Find the active section row whose JSON array contains an element with matching `_rowId`. Return if none.

2. Rebuild the array without that element (elements lacking `_rowId` survive).

3. Update `JsonData`, `UpdatedBy`, and `UpdatedDate` on that section row.

## Tables

| Table | Read or write |
|---|---|
| `TOTD_DefaultMasterData` | read/write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_OTD_DeleteDefaultMasterData] --> Find{Section with matching _rowId}
  Find -->|no| Noop[Return]
  Find -->|yes| Rebuild[STRING_AGG without that element]
  Rebuild --> Upd[Update JsonData]
```
