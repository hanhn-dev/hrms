---
object: SP_ESS_GetBusinessCardDetails
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_ESS_GetBusinessCardDetails.sql
last-analyzed: 2026-11-16
---

# SP_ESS_GetBusinessCardDetails

## What it does

Returns the employee business-card request status rows for the Business Card Request status grid.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@employeeId` | in | Employee whose requests to list |

## Call sequence

Calls nested procedures listed under Nested when present; otherwise runs inline SQL only.

## Callers

| Object | Kind |
|---|---|
| `BusinessCardDAL.GetBusinessCardDetails` | procedure |

## Nested

- [`Sp_OpenEncryptionKeys`](/docs/database/hrms/Sp_OpenEncryptionKeys)

## Steps

1. Open encryption keys.
2. SELECT pending TBusinessCards joined to pending TRequestWorkflows with Approver text.
3. UNION completed or non-pending card rows for the same employee.

## Tables

| Table | Read or write |
|---|---|
| `TBusinessCards` | read |
| `TRequestWorkflows` | read |

## Unresolved calls

None noted for this feature pass.

## Flow

```mermaid
flowchart TD
  Start[SP_ESS_GetBusinessCardDetails] --> Open[Sp_OpenEncryptionKeys]
  Open --> Pend[Pending cards with approver]
  Pend --> Done[Union completed rows]
```
