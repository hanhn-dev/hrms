---
object: USP_TCOB_GetFieldTypeLookup
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TCOB_GetFieldTypeLookup.sql
last-analyzed: 2026-11-16
---

# USP_TCOB_GetFieldTypeLookup

## What it does

Returns active field-type lookup rows (`FieldTypeID`, `FieldType`) from `TFieldType_LookUp` for Config Manager field editors and COB config publish datatype inference.

## Parameters

None.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TCOB_GetFieldTypeLookup
  Caller->>Main: execute
  Main->>Main: select active field types
```

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App caller: `ClientOnboardingDAL.getTCOBFieldTypeLookup` from Config Manager (`GET /api/clientonboard2/cfg/getFieldTypeLookup`) and nested from `generateCOBConfigFile`.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| *(none)* | — | — | — |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TCOB_GetFieldTypeLookup.sql`.
2. Select active rows from `TFieldType_LookUp` ordered by `FieldType`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TFieldType_LookUp` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["USP_TCOB_GetFieldTypeLookup"] --> Return["Active FieldType rows"]
```
