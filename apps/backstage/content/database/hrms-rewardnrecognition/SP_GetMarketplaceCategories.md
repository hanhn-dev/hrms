---
object: SP_GetMarketplaceCategories
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_GetMarketplaceCategories.sql
last-analyzed: 2026-11-16
---

# SP_GetMarketplaceCategories

## What it does

Returns every active `TRedemptionCategory` row ordered by category name, including flags for voucher requirement, fulfillment tracking, and whether the category is monetary. Used by the employee Marketplace filter list. Errors re-raise with the original severity and state.

## Parameters

None.

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetMarketplaceCategories
  participant DB as TRedemptionCategory
  Caller->>Main: execute
  Main->>DB: select active categories
  Main-->>Caller: category rows
```

## Callers

No other procedure or function in `HRMS-RewardNRecognition/STORED_PROCEDURE` executes this object. App callers live in the Rewards_and_Recognition backend that is not in this SourceCode checkout.

| Object | Kind | Page |
|---|---|---|
| Marketplace React / RnR API | app | [Marketplace](/docs/guides/reward-and-recognition/marketplace) (host only; API not in checkout) |

## Nested

None.

## Steps

In `HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_GetMarketplaceCategories.sql`:

1. Select `RedemptionCategoryID`, `CategoryName`, `RequiresVoucherCode`, `RequiresFulfillmentTracking`, and `IsMonetary` from `TRedemptionCategory` where `IsActive = 1`.
2. Order by `CategoryName`.
3. On error, capture message/severity/state and `RAISERROR` them.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRedemptionCategory` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_GetMarketplaceCategories] --> Select[Select active categories]
  Select --> Ok[Return rows]
  Select --> Err[RAISERROR on catch]
```
