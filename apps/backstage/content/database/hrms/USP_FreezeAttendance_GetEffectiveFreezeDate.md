---
object: USP_FreezeAttendance_GetEffectiveFreezeDate
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_FreezeAttendance_GetEffectiveFreezeDate.sql
last-analyzed: 2026-11-16
---

# USP_FreezeAttendance_GetEffectiveFreezeDate

## What it does

Returns the currently enforced attendance freeze date for an employer for employee (`E`) or approver (`A`) checks. Uses the active freeze’s effective columns, with fallback to the previous completed freeze when the new applicable date has not yet arrived.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employer |
| `@CheckType` | in | `E` employee / `A` approver |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_FreezeAttendance_GetEffectiveFreezeDate
  Caller->>Main: Employerid CheckType
  Main->>Main: read active freeze Effective columns
  opt applicable date not yet reached
    Main->>Main: fallback previous completed freeze
  end
  Main-->>Caller: freeze date or NULL
```

## Callers

Used by leave validation (`USP_LA_ValidateLeaveRequest`) and other L&A freeze gates.

## Nested

Calls no other procedures or functions beyond table reads.

## Steps

1. Read active freeze row for employer.
2. If applicable date for `@CheckType` has not arrived, fall back to previous completed freeze with WentInactiveDate guard.
3. Return freeze date or NULL when never frozen.

## Tables

| Table | Read or write |
|---|---|
| Freeze attendance tables (`TFreezeAttendance` / related) | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[USP_FreezeAttendance_GetEffectiveFreezeDate] --> Active[Read active freeze]
  Active --> Ready{Applicable date reached?}
  Ready -->|yes| ReturnActive[Return effective freeze date]
  Ready -->|no| Prev[Fallback previous completed freeze]
```
