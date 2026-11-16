---
object: Sp_AdminRoleM_GetDynamicMenuHierarchy
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_AdminRoleM_GetDynamicMenuHierarchy.sql
last-analyzed: 2026-11-06
---

# Sp_AdminRoleM_GetDynamicMenuHierarchy

## What it does

Returns DynamicMenuXML and Transid for an employer. When that employer has no row, it uses the parent employer. When the parent also has none, it uses employer 0.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employer whose menu XML is loaded |

## Call sequence

Calls no other procedures or functions.

## Callers

No other procedure or function calls this object.

## Nested

Calls no other procedures or functions.

## Steps

1. Read parentemployerid from Temployerdetails.
2. When TDynamicMenuHierarchy has rows for @Employerid, return those.
3. Otherwise return the parent employer's rows, or employer 0 when the parent has none.

## Tables

| Table | Read or write |
|---|---|
| `Temployerdetails` | read |
| `TDynamicMenuHierarchy` | read |

## Flow

```mermaid
flowchart TD
  Start[Sp_AdminRoleM_GetDynamicMenuHierarchy] --> Work[Run the statements in Steps]
  Work --> Done[Return]
```
