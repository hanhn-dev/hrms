---
object: SP_TNE_CreateDefaultEligibilityPolicies
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_CreateDefaultEligibilityPolicies.sql
last-analyzed: 2026-11-09
---

# SP_TNE_CreateDefaultEligibilityPolicies

## What it does

Stored procedure `SP_TNE_CreateDefaultEligibilityPolicies`. For employers that have active expense parent types in `TNE_TypeRegistry` and **no** existing non-deleted `Policies` rows, creates one default eligibility policy per expense parent type (all employees, no conditions). Used after Options Setup copies lookups. Calls no nested procedure.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@SuppressOutput` | in | BIT, default 0 — when 1, suppresses SELECT result sets for nested callers |

## Call sequence

Calls no other procedures or functions.

## Callers

| Caller | Page |
|---|---|
| [`SP_TNE_AddingNewEmployerInTLookup`](/docs/database/hrms-travelnexpense/SP_TNE_AddingNewEmployerInTLookup) | [`/docs/database/hrms-travelnexpense/SP_TNE_AddingNewEmployerInTLookup`](/docs/database/hrms-travelnexpense/SP_TNE_AddingNewEmployerInTLookup) |

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_CreateDefaultEligibilityPolicies.sql`.
2. Find employers with active expense parents in `TNE_TypeRegistry` that have no policies.
3. For each eligible employer and parent type, insert default policy / payload / history rows (script body).
4. Optionally return summary result sets unless `@SuppressOutput = 1`.

## Tables

| Table | Read or write |
|---|---|
| `TNE_TypeRegistry` | read |
| `Policies` | read and write |
| `PolicyPayloads` | write |
| policy history / eligibility payload tables used in script | write |

## Flow

```mermaid
flowchart TD
  Start[SP_TNE_CreateDefaultEligibilityPolicies] --> Elig[Employers with no policies]
  Elig --> Empty{Any eligible}
  Empty -->|no| Done[Exit]
  Empty -->|yes| Seed[Insert default expense eligibility policies]
  Seed --> EndNode[Optional result sets]
```
