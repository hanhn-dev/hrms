---
object: SP_Celebration_BroadcastUpdate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_BroadcastUpdate.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_BroadcastUpdate

## What it does

Updates a mutable broadcast, rebinds audience/attachments when allowed, audits, and returns the refreshed row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |
| `@BroadcastId` | in | Input (`INT`) |
| `@RowVer` | in | Input (`BIGINT`) |
| `@Status` | in | Input (`VARCHAR(20)`) |
| `@EmployeeId` | in | Input (`INT`) |
| `@EventDate` | in | Input (`DATE`) |
| `@PublishAt` | in | Input (`DATETIME2`) |
| `@ExpiryDate` | in | Input (`DATETIME2`) |
| `@AllowComments` | in | Input (`BIT`) |
| `@NotifyViaEmail` | in | Input (`BIT`) |
| `@MandatoryRead` | in | Input (`BIT`) |
| `@TemplateSnapshotJson` | in | Input (`NVARCHAR(MAX)`) |
| `@TitleText` | in | Input (`NVARCHAR(400)`) |
| `@AudienceJson` | in | Input (`NVARCHAR(MAX)`) |
| `@AttachmentFileIds` | in | Input (`NVARCHAR(MAX)`) |
| `@AvatarFileId` | in | Input (`INT`) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Celebration_BroadcastUpdate
  participant N0 as SP_Celebration_AuditInsert
  participant N1 as SP_Celebration_CapturePublishedAudience
  participant N2 as SP_Celebration_BroadcastGet
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
  Main->>N2: call
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_Celebration_AuditInsert` | procedure | Called while this object runs | [SP_Celebration_AuditInsert](/docs/database/hrms/SP_Celebration_AuditInsert) |
| `SP_Celebration_CapturePublishedAudience` | procedure | Called while this object runs | [SP_Celebration_CapturePublishedAudience](/docs/database/hrms/SP_Celebration_CapturePublishedAudience) |
| `SP_Celebration_BroadcastGet` | procedure | Called while this object runs | [SP_Celebration_BroadcastGet](/docs/database/hrms/SP_Celebration_BroadcastGet) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_BroadcastUpdate.sql`:

1. Updates a mutable broadcast, rebinds audience/attachments when allowed, audits, and returns the refreshed row.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.
4. Calls `SP_Celebration_AuditInsert` after a successful mutation.
5. Calls `SP_Celebration_CapturePublishedAudience` when the broadcast is published.
6. Reloads the broadcast via `SP_Celebration_BroadcastGet` before returning.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationBroadcast` | write |
| `TEmployee` | read |
| `TCelebrationBroadcastAudience` | write |
| `TCelebrationAttachment` | read |
| `TCelebrationBroadcastAudienceSnapshot` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_BroadcastUpdate] --> Run[Apply the inputs]
  Run --> Child[SP_Celebration_AuditInsert, SP_Celebration_CapturePublishedAudience, SP_Celebration_BroadcastGet]
  Child --> Done[Return the result]
```
