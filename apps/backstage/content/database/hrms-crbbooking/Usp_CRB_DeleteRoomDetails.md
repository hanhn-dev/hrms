---
object: Usp_CRB_DeleteRoomDetails
kind: procedure
database: hrms-crbbooking
source: HRMS-DATABASE/HRMS-CRBBOOKING/STOREPROCEDURE/Usp_CRB_DeleteRoomDetails.sql
last-analyzed: 2026-11-16
---

# Usp_CRB_DeleteRoomDetails

## What it does

Soft-deletes all active `TROOM_DETAILS` amenity rows for one employer/floor/room and writes history via `USP_SaveHistory_MultiID`. Blocks the delete when the room still has upcoming (non-canceled/deleted) bookings in `TCONFBOOKINGS`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@pEmployerid` | in | Employer scope; history created-by |
| `@pFloorID` | in | Floor lookup id |
| `@pRoomID` | in | Room lookup id |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Usp_CRB_DeleteRoomDetails
  participant Hist as USP_SaveHistory_MultiID
  Caller->>Main: execute
  alt upcoming bookings exist
    Main->>Main: return error with BlockingBookings
  else ok
    Main->>Main: soft-delete TROOM_DETAILS
    opt rows soft-deleted
      Main->>Hist: EXEC history D
    end
  end
```

## Callers

No other procedure or function in `HRMS-CRBBOOKING` calls this object. Application caller: CRB WebAPI `DeleteMasterData` via `masterDataDAL.DeleteMasterData` (note V1 DAL parameter drift — see Master Data guide Known gaps).

| Caller | Page |
|---|---|
| (application only) | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `USP_SaveHistory_MultiID` | procedure (synonym to core) | After soft-deleting room-detail rows | [USP_SaveHistory_MultiID](/docs/database/hrms/USP_SaveHistory_MultiID) |

## Steps

1. Script is `HRMS-DATABASE/HRMS-CRBBOOKING/STOREPROCEDURE/Usp_CRB_DeleteRoomDetails.sql`.
2. Count non-canceled/deleted bookings for the room with `BookingEndDate >=` today (UTC date); if any, return failure.
3. Soft-delete active `TROOM_DETAILS` rows for employer/floor/room (`IsDeleted = 1`).
4. When ids exist, `EXEC dbo.USP_SaveHistory_MultiID` for `TROOM_DETAILS` → `TROOM_DETAILS_History` with `ActionType` `D`.
5. Return success and amenity row count deleted.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCONFBOOKINGS` | read |
| `dbo.TROOM_DETAILS` | write |
| `dbo.TROOM_DETAILS_History` | write via nested `USP_SaveHistory_MultiID` |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[Usp_CRB_DeleteRoomDetails] --> Book{Upcoming bookings?}
  Book -->|yes| Fail[Return error]
  Book -->|no| Soft[Soft-delete TROOM_DETAILS]
  Soft --> Hist[USP_SaveHistory_MultiID]
  Hist --> Ok[Return success]
```
