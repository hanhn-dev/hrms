---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TRequestWorkflows.sql
  - HRMS-DATABASE/HRMS/SYNONYMS
confidence: medium
last-analyzed: 2026-06-26
---

# Event Pipeline

This system has **no message broker / event bus**. There are no producers,
queues, or consumers in the classic sense. The page exists to record that fact
and point to the in-database mechanisms that play the analogous roles.

## Approval requests as the "pipeline"

The nearest analog to an event stream is the **approval engine**: a request is
created, routing rows are queued in `TRequestWorkflows` (`ApproveStatus='P'`),
and approvers consume them level by level via `SP_ApproveWorkFlowRequest`. This
is synchronous, in-database, and at-most-once per routing row (the
`ApproveStatus='P' AND IsApprove=0` predicate prevents re-processing). See
`event-catalog.md` and `../domain/approval-workflow.md`.

## Notifications as side-effect "events"

On state changes, rows are written to `TEMAIL_NOTIFICATION` (per module) and to
home-page notification structures (via
`Fn_GetHomePageNotificationIdByRequestType`). Email delivery itself is performed
outside the database (by the app tier / a job), not by SQL.

## Cross-database "integration" feeds

- **Synonyms** provide synchronous cross-database reads/writes (not async events).
- **TIMEPORT integration** (`TIntegrationPartner`, `TIntegrationTokenMapping`,
  `TIntegrationFileDetails`, `TIntegrationErrorLog`) is a file/job-based
  integration layer with external partners — closer to batch ETL than eventing.
- **SSIS** staging tables (`*_SSIS_Temp_*`) are batch import pipelines.

## Delivery semantics

There is no at-least-once/exactly-once messaging substrate. Reliability comes
from transactional SQL writes and the idempotent routing-row predicate. There is
no replay mechanism beyond re-running batch jobs / re-submitting requests.

<!-- No event bus exists; mechanisms above are the in-DB equivalents. -->
