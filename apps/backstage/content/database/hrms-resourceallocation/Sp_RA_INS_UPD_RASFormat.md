---
object: Sp_RA_INS_UPD_RASFormat
kind: procedure
database: hrms-resourceallocation
source: HRMS-DATABASE/HRMS-RESOURCEALLOCATION/STOREPROCEDURE/Sp_RA_INS_UPD_RASFormat.sql
last-analyzed: 2026-11-09
---

# Sp_RA_INS_UPD_RASFormat

## What it does

Keeps `TRASFormat` aligned when an allocation type (`LookupParentId = 400`) or role (`600`) lookup text is inserted or renamed. On insert it cross-products the new value against the other dimension for Offshore and Onsite. On update it renames matching `Billable_Type` or `Category` text.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LookupText` | in | New text |
| `@OldLookupText` | in | Previous text when updating |
| `@LookupParentId` | in | `400` allocation type or `600` role |
| `@IsInsert` | in | `1` insert path, `0` update path |

## Call sequence

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

| Object | Kind | Page |
|---|---|---|
| `Sp_RA_InsertUpdate_TLookup` | procedure | [Sp_RA_InsertUpdate_TLookup](/docs/database/hrms-resourceallocation/Sp_RA_InsertUpdate_TLookup) |

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS-RESOURCEALLOCATION/STOREPROCEDURE/Sp_RA_INS_UPD_RASFormat.sql`.
2. Begin a transaction.
3. If `@IsInsert = 1` and parent `400`, and `Billable_Type` does not already exist, cursor over role texts (`Lookup_Parent_Id = 600`) and insert Offshore/Onsite `TRASFormat` rows for each.
4. If `@IsInsert = 1` and parent `600`, and `Category` does not already exist, cursor over allocation types (`Lookup_Parent_Id = 400`) and insert Offshore/Onsite rows.
5. If `@IsInsert = 0`, update `Billable_Type` or `Category` from `@OldLookupText` to `@LookupText`.
6. Commit, or rollback and rethrow on error.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRASFormat` | read and write |
| `dbo.TLOOKUP` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_RA_INS_UPD_RASFormat] --> Tx[Begin transaction]
  Tx --> Mode{IsInsert}
  Mode -->|1| ParentIns{Parent 400 or 600}
  ParentIns -->|400| InsType[Insert TRASFormat for each role]
  ParentIns -->|600| InsRole[Insert TRASFormat for each allocation type]
  Mode -->|0| ParentUpd{Parent 400 or 600}
  ParentUpd -->|400| UpdType[Rename Billable_Type]
  ParentUpd -->|600| UpdRole[Rename Category]
  InsType --> Commit[Commit]
  InsRole --> Commit
  UpdType --> Commit
  UpdRole --> Commit
```
