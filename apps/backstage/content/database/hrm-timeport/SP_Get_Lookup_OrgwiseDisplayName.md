---
object: SP_Get_Lookup_OrgwiseDisplayName
kind: procedure
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_Get_Lookup_OrgwiseDisplayName.sql
last-analyzed: 2026-11-16
---

# SP_Get_Lookup_OrgwiseDisplayName

## What it does

Returns top-level (parent) `TTSLookup` display names for an employer used as org-specific labels (SDLC / work item / artifact / location headings) in the approval detail UI.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@employerid` | in | Employer |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Get_Lookup_OrgwiseDisplayName
  Caller->>Main: execute
```

## Callers

No other procedure or function under STOREPROCEDURE or FUNCTIONS executes this object. Application caller: TimePort DAL `LookupOrgwiseDisplayName`.

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/STOREPROCEDURE/SP_Get_Lookup_OrgwiseDisplayName.sql`:

1. Select Lookup_ID / Name / Description from `TTSLookup` where parent id is 0, not deleted, for the employer.

## Tables

| Table | Read or write |
|---|---|
| `TTSLookup` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_Get_Lookup_OrgwiseDisplayName] --> Read[Top-level TTSLookup rows]
```
