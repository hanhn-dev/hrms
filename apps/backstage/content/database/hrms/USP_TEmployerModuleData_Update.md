---
object: USP_TEmployerModuleData_Update
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_TEmployerModuleData_Update.sql
last-analyzed: 2026-11-09
---

# USP_TEmployerModuleData_Update

## What it does

When `@RequestFrom` is `Update`, drops and recreates table `TEmployerModuleData` as a pivot of active `TEmployerModule` rows by module name (one column per `THrmsModules` name, 1 when the employer has that module).

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@RequestFrom` | in | Must be `Update` for the body to run |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as USP_TEmployerModuleData_Update
  participant Dyn as sp_executesql
  Caller->>Main: execute
  alt RequestFrom is Update
    Main->>Dyn: ALTER TABLE add module columns
    Main->>Dyn: INSERT pivot rows
  end
```

## Callers

Called from `USP_TLicence_SaveUpdate` when `@RequestFrom` is null (passes `Update`).

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `sp_executesql` | system | add pivot columns and insert pivoted rows | n/a |

## Steps

1. Return immediately unless `@RequestFrom = 'Update'`.
2. Drop and recreate `TEmployerModuleData` with `EmployerId`.
3. Dynamically add one `VARCHAR(200)` column per distinct `THrmsModules.ModuleName`.
4. Dynamically insert pivoted active employer-module access flags.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployerModuleData` | drop, create, write |
| `dbo.THrmsModules` | read |
| `dbo.TEmployerModule` | read |

## Unresolved calls

None beyond `sys.sp_executesql`.

## Flow

```mermaid
flowchart TD
  Start["USP_TEmployerModuleData_Update"] --> Gate{"RequestFrom Update"}
  Gate -->|"no"| EndNode["Return"]
  Gate -->|"yes"| Recreate["Drop and recreate table"]
  Recreate --> Pivot["Dynamic columns and insert"]
  Pivot --> EndNode
```
