---
object: SP_Celebration_FileDelete
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_FileDelete.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_FileDelete

## What it does

Deletes a celebration file row when the actor may remove it.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@ActorEmployeeId` | in | Input (`INT`) |
| `@FileId` | in | Input (`INT`) |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_FileDelete.sql`:

1. Deletes a celebration file row when the actor may remove it.
2. May return a validation `ResultCode` / `Message` result set instead of mutating when inputs fail checks.

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationAttachment` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_FileDelete] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
