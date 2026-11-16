---
object: OV_Template_CategoryMasterList
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_Template_CategoryMasterList.sql
last-analyzed: 2026-11-09
---

# OV_Template_CategoryMasterList

## What it does

Lists active OccuranceVialoationCategory rows as template tab categories (TabCategoryID and TabCategoryName).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `(none)` | - | Procedure takes no parameters |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object. `ViolationsOccurrenceDAL` in Core API executes it for Setup Violations & Occurrence (template modal tab list).

## Nested

Calls no other procedures or functions.

## Steps

1. In `HRMS-DATABASE/HRMS/STOREPROCEDURE/OV_Template_CategoryMasterList.sql`, select distinct CategoryID and CategoryDisplayText where Active = 1.

## Tables

| Table | Read or write |
|---|---|
| `dbo.OccuranceVialoationCategory` | read |

## Flow

```mermaid
flowchart TD
  Start["OV_Template_CategoryMasterList"]
  Sel["Select active tabs"]
  Start --> Sel
```
