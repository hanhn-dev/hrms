---
object: Sp_DeleteEmpHomeLoanLetOutDet
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_DeleteEmpHomeLoanLetOutDet.sql
last-analyzed: 2026-11-16
---

# Sp_DeleteEmpHomeLoanLetOutDet

## What it does

Soft-deletes one `TEmpHomeLoanLetOutDet` row by setting `IsDeleted = 'Y'` for the given key. Used when the Investment Declaration UI turns that section off after it already had a saved id.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@HomeLoanDetId` | in | Row key to soft-delete |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_DeleteEmpHomeLoanLetOutDet
  Caller->>Main: execute
  Main->>Main: set IsDeleted Y on TEmpHomeLoanLetOutDet
```

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object. Application caller: Core Node `IncomeTaxDeclarationDAL` update helpers when the matching section is inactive but an id already exists. `SP_EC_DeleteEmployee` deletes from `TEmpHomeLoanLetOutDet` directly rather than executing this procedure.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_DeleteEmpHomeLoanLetOutDet.sql`.
2. Update `TEmpHomeLoanLetOutDet` set `IsDeleted = 'Y'` where `HomeLoanDetId` equals `@HomeLoanDetId`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmpHomeLoanLetOutDet` | write |

## Flow

```mermaid
flowchart TD
  Start["Sp_DeleteEmpHomeLoanLetOutDet"] --> Soft["Set IsDeleted Y"]
```
