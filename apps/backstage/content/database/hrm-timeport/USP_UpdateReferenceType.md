---
object: USP_UpdateReferenceType
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_UpdateReferenceType.sql
last-analyzed: 2026-11-16
---

# USP_UpdateReferenceType

## What it does

Renames a top-level TimePort reference type (TTSLOOKUP parent) for an employer.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employer id |
| `@ReferenceTypeId` | in | Lookup id with Lookup_Parent_ID = 0 |
| `@ReferenceTypeText` | in | New display name |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_UpdateReferenceType
  Caller->>Main: execute
```

## Callers

Application only. timeportDAL.UpdateReferenceType.

## Nested

This object does not execute another procedure or user-defined function.

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/USP_UpdateReferenceType.sql`:

1. BEGIN TRANSACTION.
2. If the parent lookup exists and is not deleted, UPDATE LOOKUP_NAME.
3. COMMIT.

## Tables

| Table | Read or write |
|---|---|
| `TTSLOOKUP` | write |

## Unresolved calls

None recorded for this page.

## Flow

```mermaid
flowchart TD
  Start[USP_UpdateReferenceType] --> S0
  S0["BEGIN TRANSACTION."]
  S1["If the parent lookup exists and is not deleted, UPDATE LOOKU"]
  S2["COMMIT."]
  S0 --> S1
  S1 --> S2
  S2 --> Done[Return]
```
