---
object: Sp_IT_GetIncomeTaxSectionDet
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_IT_GetIncomeTaxSectionDet.sql
last-analyzed: 2026-11-16
---

# Sp_IT_GetIncomeTaxSectionDet

## What it does

Returns all income-tax section rows for an employer with Yes/No limit and Active/InActive labels, creator and modifier display names, and dates. Opens encryption keys so `Fn_GetEmployeeName` can resolve names. Used by PayRoll Setup Masters Manage Sections grid.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as Sp_IT_GetIncomeTaxSectionDet
  participant Open as Sp_OpenEncryptionKeys
  participant Fn as Fn_GetEmployeeName
  participant Close as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Open: Exec
  Main->>Fn: CreatedBy and ModifiedBy
  Main->>Close: Exec
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `IncomeTaxDeclarationDAL.GetIncomeTaxSections` | app | [Setup Masters](/docs/guides/payroll/setup-masters) |
| `IncomeTaxDeclarationDAL.GetIncomeTaxSectionNames` | app | Same SP; not used by Setup Masters React tabs |

No other procedure in `STOREPROCEDURE/` executes it.

## Nested

| Object | Kind | Role |
|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | Open keys before name resolution |
| `Fn_GetEmployeeName` | function | Creator/modifier display name |
| `SP_CloseEncryptionKey` | procedure | Close keys after select |

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_IT_GetIncomeTaxSectionDet.sql`.
2. `Exec Sp_OpenEncryptionKeys`.
3. `SELECT` from `TIncomeTaxSection` for `@EmployerId`, mapping limit and active flags, ordered by `IsNull(ModifiedDate, CreatedDate) desc`.
4. `Exec SP_CloseEncryptionKey`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TIncomeTaxSection` | read |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[Sp_IT_GetIncomeTaxSectionDet] --> Open[Sp_OpenEncryptionKeys]
  Open --> Read[Read TIncomeTaxSection]
  Read --> Names[Fn_GetEmployeeName]
  Names --> Close[SP_CloseEncryptionKey]
  Close --> EndNode[Return rows]
```
