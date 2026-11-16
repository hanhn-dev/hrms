---
object: SP_CreateOrUpdateWallOfFame
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_CreateOrUpdateWallOfFame.sql
last-analyzed: 2026-11-16
---

# SP_CreateOrUpdateWallOfFame

## What it does

Creates or updates a Wall of Fame entry (`TWallOfFame`) for an employer. Reads `TRnR_WorkflowConfiguration` for `WallOfFameAward`: when enabled, the entry is pending approval with request-workflow / email side effects; when disabled, it is auto-approved. Writes history via `USP_SaveHistory`.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@WallOfFameId` | in | Existing id for update; null/0 inserts |
| `@EmployerId` | in | Employer scope |
| `@UserId` | in | User context |
| `@WallOfFameTitle` | in | Title |
| `@WallOfFameStory` | in | Optional story |
| `@ActiveFrom` / `@ActiveTo` | in | Active window |
| `@CreatedByUserId` | in | Acting user |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_CreateOrUpdateWallOfFame
  participant Wf as SP_CM_GetWorkflowTreeXmlDetailsByPageTitle
  participant RW as SP_CM_GetDataforRequestWorkFlows
  participant Hist as USP_SaveHistory
  Caller->>Main: execute
  alt workflow enabled
    Main->>Wf: WallOfFameAward tree
    Main->>RW: approver rows
  end
  Main->>Hist: snapshot
  Main-->>Caller: result
```

## Callers

No other procedure executes this object. App callers: Rewards_and_Recognition admin wall-of-fame API → [Admin Console](/docs/guides/reward-and-recognition/admin-console).

## Nested

| Object | Kind | When |
|---|---|---|
| `SP_CM_GetWorkflowTreeXmlDetailsByPageTitle` | procedure | workflow on |
| `SP_CM_GetDataforRequestWorkFlows` | procedure | workflow on |
| `SP_CM_GetDataForEmailNotification` | procedure | workflow on |
| `FN_CM_GetMgrFromRequestWorkflows` | function | workflow on |
| `FN_GetEmployeeName_Multi` | function | workflow on |
| `USP_SaveHistory` | procedure (synonym) | after save |

## Steps

1. Script is `HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_CreateOrUpdateWallOfFame.sql`.
2. Validate employer/user and active dates; read workflow toggle for `WallOfFameAward`.
3. When workflow on, resolve workflow tree and approvers.
4. Insert or update `TWallOfFame` as pending or approved.
5. When workflow on, write `TRequestWorkflows` and email notification rows.
6. Snapshot with `USP_SaveHistory`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TRnR_WorkflowConfiguration` | read |
| `dbo.TWallOfFame` | read/write |
| `dbo.TRequestWorkflows` | write when workflow on |
| `dbo.TEmailNotification` | write when workflow on |

## Unresolved calls

`USP_SaveHistory` body not present in RewardNRecognition Liquibase (synonym to HRMS).

## Flow

```mermaid
flowchart TD
  Start[SP_CreateOrUpdateWallOfFame] --> Toggle{Workflow enabled?}
  Toggle -->|yes| Wf[Workflow and notifications]
  Toggle -->|no| Auto[Auto approve]
  Wf --> Save[Upsert TWallOfFame]
  Auto --> Save
  Save --> Hist[USP_SaveHistory]
```
