---
object: GetMinTrainingDateTime
kind: function
database: hrms-training
source: HRMS-DATABASE/HRMS-TRAINING/FUNCTIONS/GetMinTrainingDateTime.sql
last-analyzed: 2026-11-16
---

# GetMinTrainingDateTime

## What it does

User-defined function `GetMinTrainingDateTime`. Invoked from other SQL objects; see Steps and Tables for behaviour derived from the script.

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

1. Script is `HRMS-DATABASE/HRMS-TRAINING/FUNCTIONS/GetMinTrainingDateTime.sql`.
2. `Select @MinDateTime = MIN(Convert(datetime,SessionDate)) + MIN(convert(datetime,StartTime)) From TTrainingSession Where TrainingID = @Traini`

## Tables

| Table | Read or write |
|---|---|
| `TTrainingSession` | read |

## Flow

```mermaid
flowchart TD
  Start[GetMinTrainingDateTime] --> S0
  S0 --> EndNode[Return]
  S0["Select @MinDateTime = MIN(Convert(datetime,SessionDate)) + M"]
```
