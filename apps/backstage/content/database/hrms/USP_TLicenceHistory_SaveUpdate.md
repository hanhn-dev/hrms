---
object: USP_TLicenceHistory_SaveUpdate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TLicenceHistory_SaveUpdate.sql
last-analyzed: 2026-11-09
---

# USP_TLicenceHistory_SaveUpdate

## What it does

Copies the current `TLicence` row into `TLicenceHistory` and copies that licence's `TEmployerModule` rows into `TEmployerModuleHistory` for the new history id.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LicenceID` | in | Licence to snapshot |
| `@CreatedBy` | in | Employee id stored as history creator |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TLicenceHistory_SaveUpdate
  Caller->>Main: execute
  Main-->>Caller: inserts complete
```

## Callers

Called only from `USP_TLicence_SaveUpdate` after insert or update.

## Nested

None.

## Steps

1. Insert one `TLicenceHistory` row from `TLicence` for `@LicenceID`, including soft-delete flags.
2. Capture `@LicenceHistoryID`.
3. Insert `TEmployerModuleHistory` rows from `TEmployerModule` for that licence.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TLicence` | read |
| `dbo.TLicenceHistory` | write |
| `dbo.TEmployerModule` | read |
| `dbo.TEmployerModuleHistory` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["USP_TLicenceHistory_SaveUpdate"] --> InsH["Insert TLicenceHistory"]
  InsH --> InsM["Insert TEmployerModuleHistory"]
```
