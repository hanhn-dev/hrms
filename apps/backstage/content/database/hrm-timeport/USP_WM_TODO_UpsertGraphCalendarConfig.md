---
object: USP_WM_TODO_UpsertGraphCalendarConfig
kind: procedure
database: hrm-timeport
source: live DEV HRM_CL_TIMEPORT (not in HRMS-DATABASE/HRM-TIMEPORT Liquibase inventory)
last-analyzed: 2026-11-16
---

# USP_WM_TODO_UpsertGraphCalendarConfig

## What it does

Idempotent MERGE of employer Graph tenant/client/secret settings used by Meeting Invites.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | INT |
| `@GraphTenantId` | in | UNIQUEIDENTIFIER |
| `@GraphClientId` | in | UNIQUEIDENTIFIER |
| `@ClientSecretEncrypted` | in | NVARCHAR |
| `@SecretExpiresOn` | in | DATE (default NULL) |
| `@WindowsTimeZone` | in | NVARCHAR |
| `@IanaTimeZone` | in | NVARCHAR |
| `@IsEnabled` | in | BIT (default 1) |
| `@ModifiedBy` | in | NVARCHAR |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_WM_TODO_UpsertGraphCalendarConfig
  Caller->>Main: execute
```

## Callers

Application callers are expected from the My Planner Vite SPA / Work Management `/todo` API (SPA and API sources are not in this SourceCode checkout). `TDataCatalog` maps My Planner to these `USP_WM_TODO_*` objects. No peer procedure nested-call into this object was found in the live definitions reviewed for this guide.

## Nested

Calls no other procedures or functions.

## Steps

Live definition in `HRM_CL_TIMEPORT` (script not checked into Liquibase):

1. Require secret on first insert.
2. MERGE Graph tenant/client/secret/timezone/enabled flags.

## Tables

| Table | Read or write |
|---|---|
| `TWM_TODO_GraphCalendarConfig` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_WM_TODO_UpsertGraphCalendarConfig] --> Work[Read or write todo tables]
  Work --> Done[Return result set or status]
```
