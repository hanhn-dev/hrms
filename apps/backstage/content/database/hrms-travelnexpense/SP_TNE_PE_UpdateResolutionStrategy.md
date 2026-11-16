---
object: SP_TNE_PE_UpdateResolutionStrategy
kind: procedure
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_PE_UpdateResolutionStrategy.sql
last-analyzed: 2026-11-09
---

# SP_TNE_PE_UpdateResolutionStrategy

## What it does

Upserts the resolution strategy on `PolicyEngineConfig` for a module, employer, and policy type, then bumps the policy change log for that scope.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@ModuleKey` | in | Module |
| `@EmployerId` | in | Employer |
| `@PolicyTypeKey` | in | `eligibility`, `limit`, or `accrual` |
| `@ResolutionStrategy` | in | `UNION`, `DENY_OVERRIDES`, `LATEST_WINS`, or `MOST_SPECIFIC` |
| `@UpdatedBy` | in | Actor id string |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_TNE_PE_UpdateResolutionStrategy
  participant Bump as SP_TNE_PE_BumpPolicyChangeLog
  Caller->>Main: execute
  Main->>Bump: after MERGE
```

## Callers

No other procedure or function calls this object. `PolicyEngineDAL.UpdateResolutionStrategyAsync` executes it from Engine Settings.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_TNE_PE_BumpPolicyChangeLog` | procedure | after the MERGE | [SP_TNE_PE_BumpPolicyChangeLog](/docs/database/hrms-travelnexpense/SP_TNE_PE_BumpPolicyChangeLog) |

## Steps

1. In `HRMS-DATABASE/HRMS_TRAVELNEXPENSE/STOREPROCEDURE/SP_TNE_PE_UpdateResolutionStrategy.sql`, validate module, employer, policy type, and strategy values.
2. MERGE `PolicyEngineConfig` to update or insert the strategy.
3. Execute `SP_TNE_PE_BumpPolicyChangeLog`.
4. Return a success result set with the posted keys and strategy.

## Tables

| Table | Read or write |
|---|---|
| `PolicyEngineConfig` | write |

## Flow

```mermaid
flowchart TD
  Start[SP_TNE_PE_UpdateResolutionStrategy] --> Val[Validate inputs]
  Val --> Merge[MERGE PolicyEngineConfig]
  Merge --> Bump[SP_TNE_PE_BumpPolicyChangeLog]
  Bump --> Done[Return success]
```
