---
object: SP_GetAllPOBTemplateForms
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_GetAllPOBTemplateForms.sql
last-analyzed: 2026-11-09
---

# SP_GetAllPOBTemplateForms

## What it does

Returns active template-form file rows for one employer and template, including the template country id. Opens and closes encryption keys around the select.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@Employerid` | in | Employer of the forms |
| `@TemplateId` | in | Template whose forms are listed |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_GetAllPOBTemplateForms
  participant Open as Sp_OpenEncryptionKeys
  participant Close as SP_CloseEncryptionKey
  Caller->>Main: execute
  Main->>Open: open keys
  Main->>Close: close keys
```

## Callers

No other procedure or function calls this object.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `Sp_OpenEncryptionKeys` | procedure | before the select | [Sp_OpenEncryptionKeys](/docs/database/hrms/Sp_OpenEncryptionKeys) |
| `SP_CloseEncryptionKey` | procedure | after the select | [SP_CloseEncryptionKey](/docs/database/hrms/SP_CloseEncryptionKey) |

## Steps

1. Execute `Sp_OpenEncryptionKeys`.
2. Select active `POBTemplateForms` rows for the employer and template, joined to `POBTemplate` for `CountryID`.
3. Execute `SP_CloseEncryptionKey`.

## Tables

| Table | Read or write |
|---|---|
| `POBTemplateForms` | read |
| `POBTemplate` | read |

## Flow

```mermaid
flowchart TD
  Start[SP_GetAllPOBTemplateForms] --> Open[Open encryption keys]
  Open --> Read[Read active forms]
  Read --> Close[Close encryption keys]
```
