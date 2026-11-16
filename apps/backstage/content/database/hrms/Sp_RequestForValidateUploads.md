---
object: Sp_RequestForValidateUploads
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_RequestForValidateUploads.sql
last-analyzed: 2026-11-16
---

# Sp_RequestForValidateUploads

## What it does

Marks one Client Onboarding upload request as ready for validation (`Validate = 1`). When that request has `IsPartiallyDataProcess = 1`, it also inserts a process-queue row by calling `Sp_InsertProcessUploadRequests` with the request's employer and creator.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RequestId` | in | `TBulkUploadRequests.RequestId` to validate |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_RequestForValidateUploads
  participant Proc as Sp_InsertProcessUploadRequests
  Caller->>Main: execute
  Main->>Main: set Validate 1
  alt IsPartiallyDataProcess is 1
    Main->>Proc: RequestId EmployerId CreatedBy
  end
```

## Callers

Procedures and functions that call this object.

No other procedure or function calls this object. App caller: `bulkUploadDAL.ValidateUploadRequest` from Upload Files (`UploadedFilesGridComponent`).

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_InsertProcessUploadRequests` | procedure | `@IsPartiallyDataProcess = 1` on the request | [Sp_InsertProcessUploadRequests](/docs/database/hrms/Sp_InsertProcessUploadRequests) |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_RequestForValidateUploads.sql`.
2. `UPDATE TBulkUploadRequests SET Validate = 1` for `@RequestId`.
3. Read `CreatedBy`, `EmployerId`, and `IsPartiallyDataProcess` for that request.
4. When `IsPartiallyDataProcess = 1`, execute `Sp_InsertProcessUploadRequests`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TBulkUploadRequests` | read, write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["Sp_RequestForValidateUploads"] --> Flag["Set Validate 1"]
  Flag --> Read["Read partial flag"]
  Read --> Partial{"IsPartiallyDataProcess"}
  Partial -->|yes| Proc["Sp_InsertProcessUploadRequests"]
  Partial -->|no| Done["Return"]
```
