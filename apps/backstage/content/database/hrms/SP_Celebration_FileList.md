---
object: SP_Celebration_FileList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_FileList.sql
last-analyzed: 2026-11-09
---

# SP_Celebration_FileList

## What it does

Lists files for an owner type and owner id (broadcast, wish, template).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Input (`INT`) |
| `@OwnerType` | in | Input (`VARCHAR(20)`) |
| `@OwnerId` | in | Input (`INT`) |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/161632/SP_Celebration_FileList.sql`:

1. Lists files for an owner type and owner id (broadcast, wish, template).

## Tables

| Table | Read or write |
|---|---|
| `TCelebrationAttachment` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Celebration_FileList] --> Run[Apply the inputs]
  Run --> Done[Return the result]
```
