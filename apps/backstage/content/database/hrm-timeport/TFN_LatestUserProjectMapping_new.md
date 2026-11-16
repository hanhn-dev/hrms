---
object: TFN_LatestUserProjectMapping_new
kind: function
database: hrm-timeport
source: HRMS-DATABASE/HRM-TIMEPORT/FUNCTIONS/TFN_LatestUserProjectMapping_new.sql
last-analyzed: 2026-11-16
---

# TFN_LatestUserProjectMapping_new

## What it does

Returns the latest effective `TTSUserProjectMapping` row for an employee/project-config as of a timesheet date (temporal-aware), used when an approver modifies lines.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| Employee / ProjectConfig / date args as declared in the function | in | Resolve latest mapping |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as TFN_LatestUserProjectMapping_new
  Caller->>Main: OUTER APPLY
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `SP_TS_InsModifyTheRecordByApprover` | procedure | [SP_TS_InsModifyTheRecordByApprover](/docs/database/hrm-timeport/SP_TS_InsModifyTheRecordByApprover) |

## Nested

Calls no other procedures or functions.

## Steps

In `HRMS-DATABASE/HRM-TIMEPORT/FUNCTIONS/TFN_LatestUserProjectMapping_new.sql`:

1. Read temporal user-project mapping for the employee/config/date.
2. Return the latest applicable mapping attributes.

## Tables

| Table | Read or write |
|---|---|
| `TTSUserProjectMapping` | read |

## Flow

```mermaid
flowchart TD
  Start[TFN_LatestUserProjectMapping_new] --> Latest[Latest mapping for date]
```
