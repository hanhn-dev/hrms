---
object: SP_AdminEMP_RootEmployerEmployeeSearch
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminEMP_RootEmployerEmployeeSearch.sql
last-analyzed: 2026-11-09
---

# SP_AdminEMP_RootEmployerEmployeeSearch

## What it does

Looks up employees under a root employer tree that share a given email address. Classic Search Employee uses this when validating copy / root-employer email conflicts.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer whose root tree is searched |
| `@EmailId` | in | Email address to match |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminEMP_RootEmployerEmployeeSearch
  participant DB as Database
  Caller->>Main: execute
  Main->>DB: select employees by root employer and email
```

## Callers

Application caller: classic `SearchEmployee.aspx.cs` via `EmployeeBll.EmployeeSearchRoot` → `EmployeeDal.EmployeeSearchRoot`.

## Nested

None beyond ordinary table reads.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminEMP_RootEmployerEmployeeSearch.sql`.
2. Resolve the root employer for `@EmployerId`.
3. Return employees in that root scope whose email matches `@EmailId`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployee` | read |
| `dbo.TEmployerDetails` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminEMP_RootEmployerEmployeeSearch] --> Root[Resolve root employer]
  Root --> Match[Match email under root]
  Match --> Ret[Return rows]
```
