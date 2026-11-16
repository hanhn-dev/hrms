---
object: USP_EmailCommunication_List
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_EmailCommunication_List.sql
last-analyzed: 2026-11-09
---

# USP_EmailCommunication_List

## What it does

Lists candidate email-communication rows for an employer, optionally filtered by candidate ids.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |
| `@EmailCommunicationID` | in | INT |
| `@CandidateIds` | in | VARCHAR |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_EmailCommunication_List
  participant C0 as UFN_GetDateTimeFormatForPlaceholder
  participant C1 as Fn_GetEmployeeName
  Caller->>Main: execute
  Main->>C0: call
  Main->>C1: call
```

## Callers

Application callers include Core API `preOnBoardingDAL` methods used by **Employee Management → Pre-Onboarding Candidate** (`PreOnboardCandidate.aspx`). Search HRMS `STOREPROCEDURE/` and `FUNCTIONS/` for additional `EXEC`/`dbo.` callers when extending this page.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `UFN_GetDateTimeFormatForPlaceholder` | function | always when reached | [UFN_GetDateTimeFormatForPlaceholder](/docs/database/hrms/UFN_GetDateTimeFormatForPlaceholder) |
| `Fn_GetEmployeeName` | function | always when reached | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

From `HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_EmailCommunication_List.sql`:

1. See script body for ordered statements.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmailCommunication` | read |
| `dbo.POBCandidate` | read |

## Flow

```mermaid
flowchart TD
  Start["USP_EmailCommunication_List"] --> Body["Run script body"]
  Body --> Done["Return result or complete writes"]
```
