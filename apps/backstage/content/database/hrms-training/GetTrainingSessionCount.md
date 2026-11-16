---
object: GetTrainingSessionCount
kind: function
database: hrms-training
source: HRMS-DATABASE/HRMS-TRAINING/FUNCTIONS/GetTrainingSessionCount.sql
last-analyzed: 2026-11-16
---

# GetTrainingSessionCount

## What it does

User-defined function `GetTrainingSessionCount`. Invoked from other SQL objects; see Steps and Tables for behaviour derived from the script.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@TrainingID` | in | Int |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS-TRAINING/FUNCTIONS/GetTrainingSessionCount.sql`.
2. `Select @Cnt = COUNT(SessionId) From TTrainingSession Where TrainingID = @TrainingID`

## Tables

| Table | Read or write |
|---|---|
| `TTrainingSession` | read |

## Flow

```mermaid
flowchart TD
  Start[GetTrainingSessionCount] --> S0
  S0 --> EndNode[Return]
  S0["Select @Cnt = COUNT(SessionId) From TTrainingSession Where T"]
```
