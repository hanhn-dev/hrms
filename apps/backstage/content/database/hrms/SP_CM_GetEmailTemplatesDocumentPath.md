---
object: SP_CM_GetEmailTemplatesDocumentPath
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_CM_GetEmailTemplatesDocumentPath.sql
last-analyzed: 2026-11-09
---

# SP_CM_GetEmailTemplatesDocumentPath

## What it does

Returns `DocumentPath` from `TDocumentPaths` for a given `DocumentType`. HRMS Licenses calls it with type `HRMSLicense` to resolve the upload base folder.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@DocumentType` | in | Path key, e.g. `HRMSLicense` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_CM_GetEmailTemplatesDocumentPath
  Caller->>Main: execute
  Main-->>Caller: DocumentPath rows
```

## Callers

No other procedure calls this object. Shared by several features via `dashBoardDAL.GetDocumentPath`. HRMS Licenses uses document type `HRMSLicense`.

## Nested

None.

## Steps

1. Select `DocumentPath` from `TDocumentPaths` where `DocumentType = @DocumentType`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TDocumentPaths` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["SP_CM_GetEmailTemplatesDocumentPath"] --> Out["Select DocumentPath"]
```
