---
object: Sp_DeleteEmpHomeLoanDet
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_DeleteEmpHomeLoanDet.sql
last-analyzed: 2026-11-16
---

# Sp_DeleteEmpHomeLoanDet

## What it does

Soft-deletes one `TEmpHomeLoanDet` row by setting `isdeleted = 'Y'` for the given key. Used when the Investment Declaration UI turns that section off after it already had a saved id.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@HomeLoanId` | in | Row key to soft-delete |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_DeleteEmpHomeLoanDet
  Caller->>Main: execute
  Main->>Main: set isdeleted Y on TEmpHomeLoanDet
```

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object. Application caller: Core Node `IncomeTaxDeclarationDAL` update helpers when the matching section is inactive but an id already exists. `SP_EC_DeleteEmployee` deletes from `TEmpHomeLoanDet` directly rather than executing this procedure.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_DeleteEmpHomeLoanDet.sql`.
2. Update `TEmpHomeLoanDet` set `isdeleted = 'Y'` where `HomeLoanId` equals `@HomeLoanId`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmpHomeLoanDet` | write |

## Flow

```mermaid
flowchart TD
  Start["Sp_DeleteEmpHomeLoanDet"] --> Soft["Set isdeleted Y"]
```
