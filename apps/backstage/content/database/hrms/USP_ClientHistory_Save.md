---
object: USP_ClientHistory_Save
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_ClientHistory_Save.sql
last-analyzed: 2026-11-09
---

# USP_ClientHistory_Save

## What it does

Copies the current `TClient` row for `@ClientID` into `TClientHistory`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ClientID` | in | Client whose current row is snapshotted |

## Call sequence

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

| Object | Kind | Page |
|---|---|---|
| `USP_Client_SaveUpdate` | procedure | [USP_Client_SaveUpdate](/docs/database/hrms/USP_Client_SaveUpdate) |
| `Sp_RA_Delete_TLookup` | procedure | [Sp_RA_Delete_TLookup](/docs/database/hrms-resourceallocation/Sp_RA_Delete_TLookup) |

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_ClientHistory_Save.sql`.
2. Insert into `TClientHistory` selecting matching columns from `TClient` where `ClientID = @ClientID`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TClient` | read |
| `dbo.TClientHistory` | write |

## Flow

```mermaid
flowchart TD
  Start[USP_ClientHistory_Save] --> Copy[Insert TClientHistory from TClient]
  Copy --> EndNode[Return]
```
