---
object: SP_Get_DocumentTemplate_Role_Employees
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_Get_DocumentTemplate_Role_Employees.sql
last-analyzed: 2026-11-09
---

# SP_Get_DocumentTemplate_Role_Employees

## What it does

Expands a template's stored access lists into a single comma-separated display string. When `@RoleIds` is set, it aggregates role names. Otherwise, when `@EmployeeIds` is set, it aggregates active employee names with employment numbers. `@Documentid` is accepted but not used in the body.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Documentid` | in | Document id (unused in the SELECT) |
| `@RoleIds` | in | Comma-separated role ids |
| `@EmployeeIds` | in | Comma-separated employee ids |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Get_DocumentTemplate_Role_Employees
  participant Fn_GetEmployeeName as Fn_GetEmployeeName
  Caller->>Main: execute
  alt RoleIds present
    Main->>Main: STRING_AGG role names
  else EmployeeIds present
    Main->>Fn_GetEmployeeName: name per employee
  end
```

## Callers

No other procedure or function calls this object. `DocBuilderDAL.GetDocumentTemplateRoleEmployees` executes it from `DocumentAccessCell.jsx`.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Fn_GetEmployeeName` | function | employee-ids branch | [Fn_GetEmployeeName](/docs/database/hrms/Fn_GetEmployeeName) |

## Steps

1. When `@RoleIds` is not empty, aggregate `RoleName` from `tRoles` for the split ids.
2. Else when `@EmployeeIds` is not empty, aggregate active employee display names from `tEmployee` / `tEmployeeInfo`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.tRoles` | read |
| `dbo.tEmployee` | read |
| `dbo.tEmployeeInfo` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["SP_Get_DocumentTemplate_Role_Employees"] --> Roles{"RoleIds set"}
  Roles -->|"yes"| RoleAgg["Aggregate role names"]
  Roles -->|"no"| Emps{"EmployeeIds set"}
  Emps -->|"yes"| EmpAgg["Aggregate employee names"]
```
