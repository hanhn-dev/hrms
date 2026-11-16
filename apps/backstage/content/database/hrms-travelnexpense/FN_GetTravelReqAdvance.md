---
object: FN_GetTravelReqAdvance
kind: function
database: hrms-travelnexpense
source: HRMS-DATABASE/HRMS_TRAVELNEXPENSE/FUNCTIONS/FN_GetTravelReqAdvance.sql
last-analyzed: 2026-11-16
---

# FN_GetTravelReqAdvance

## What it does

Scalar bit function that returns `1` when the travel request has at least one `TTRAVEL_REQ_ADVANCE` row, otherwise `0`. Used by `Sp_TnE_GetTravelReportData` to filter on advance requested.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TravelRequestId` | in | Travel request to test |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as FN_GetTravelReqAdvance
  Caller->>Main: execute
  Main-->>Caller: bit
```

## Callers

| Caller | Page |
|---|---|
| `Sp_TnE_GetTravelReportData` | [Sp_TnE_GetTravelReportData](/docs/database/hrms-travelnexpense/Sp_TnE_GetTravelReportData) |

## Nested

Calls no other procedures or functions.

## Steps

1. Script `HRMS-DATABASE/HRMS_TRAVELNEXPENSE/FUNCTIONS/FN_GetTravelReqAdvance.sql`.
2. Count rows in `TTRAVEL_REQ_ADVANCE` for `@TravelRequestId`.
3. Return `0` when count is zero, else `1`.

## Tables

| Table | Read or write |
|---|---|
| `TTRAVEL_REQ_ADVANCE` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[FN_GetTravelReqAdvance] --> Cnt[Count TTRAVEL_REQ_ADVANCE]
  Cnt --> Ret[Return bit]
```
