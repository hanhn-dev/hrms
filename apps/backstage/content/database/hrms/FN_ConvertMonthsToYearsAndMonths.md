---
object: FN_ConvertMonthsToYearsAndMonths
kind: function
database: hrms
source: HRMS-DATABASE/HRMS/FUNCTIONS/FN_ConvertMonthsToYearsAndMonths.sql
last-analyzed: 2026-10-09
---

# FN_ConvertMonthsToYearsAndMonths

## What it does

Splits a total number of months into whole years and a remainder, then returns one of those parts as text. The header cites PBI 87825, with a later change for PBI 94553.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TotalMonths` | in | Integer month count to divide by 12 |
| `@Type` | in | `NVARCHAR(10)` selector compared with the literals `years` and `months` |

## Steps

In `HRMS-DATABASE/HRMS/FUNCTIONS/FN_ConvertMonthsToYearsAndMonths.sql`:

1. Set `@Years` to `@TotalMonths / 12` and `@Months` to `@TotalMonths % 12`.
2. When `@Type = 'years'`, return `@Years` as `NVARCHAR(10)`.
3. When `@Type = 'months'`, return `@Months` as `NVARCHAR(10)`.
4. Otherwise return both numbers as text, separated by a comma and a space.

## Tables

| Table | Read or write |
|---|---|
| — | The function does not read or write a table |

## Procedures and functions it calls

Calls no other procedures or functions.

## Flow

```mermaid
flowchart TD
  Start[FN_ConvertMonthsToYearsAndMonths] --> Split[Divide total months by 12]
  Split --> Years{Type is years}
  Years -->|yes| ReturnYears[Return the year count]
  Years -->|no| Months{Type is months}
  Months -->|yes| ReturnMonths[Return the remainder]
  Months -->|no| ReturnBoth[Return years and months]
```

## Call sequence

Calls no other procedures or functions.
