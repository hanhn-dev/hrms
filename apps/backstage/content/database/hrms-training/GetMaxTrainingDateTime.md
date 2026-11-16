---
object: GetMaxTrainingDateTime
kind: function
database: hrms-training
source: HRMS-DATABASE/HRMS-TRAINING/FUNCTIONS/GetMaxTrainingDateTime.sql
last-analyzed: 2026-11-16
---

# GetMaxTrainingDateTime

## What it does

User-defined function `GetMaxTrainingDateTime`. Invoked from other SQL objects; see Steps and Tables for behaviour derived from the script.

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

1. Script is `HRMS-DATABASE/HRMS-TRAINING/FUNCTIONS/GetMaxTrainingDateTime.sql`.
2. `Select @MaxDateTime = MAX(Convert(datetime,SessionDate)) + MAX(convert(datetime,EndTime)) From TTrainingSession Where TrainingID = @Training`

## Tables

| Table | Read or write |
|---|---|
| `TTrainingSession` | read |

## Flow

```mermaid
flowchart TD
  Start[GetMaxTrainingDateTime] --> S0
  S0 --> EndNode[Return]
  S0["Select @MaxDateTime = MAX(Convert(datetime,SessionDate)) + M"]
```
