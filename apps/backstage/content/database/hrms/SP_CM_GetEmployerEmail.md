---
object: SP_CM_GetEmployerEmail
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_CM_GetEmployerEmail.sql
last-analyzed: 2026-11-06
---

# SP_CM_GetEmployerEmail

## What it does

Returns the employer notification sender email from TEmployerDetails.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer |

## Call sequence

Calls no other procedures or functions.

## Callers

Procedures and functions that call this object.

| Object | Kind | Page |
|---|---|---|
| `SP_RRS_UpdateCommentOfReqForInformation` | procedure | No page yet |

## Nested

Calls no other procedures or functions.

## Steps

1. Select `NotificationSenderEmail` from `TEmployerDetails` for `@EmployerId` (`SP_CM_GetEmployerEmail.sql`).

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployerDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_CM_GetEmployerEmail] --> Mail[Return sender email]
```
