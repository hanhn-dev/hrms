---
object: SP_Licence_InsertUpdateEmployerDataRetention
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_Licence_InsertUpdateEmployerDataRetention.sql
last-analyzed: 2026-11-09
---

# SP_Licence_InsertUpdateEmployerDataRetention

## What it does

Inserts or updates an active `TEmployerDataRetention` row for an organisation that has an Inactive licence. Validates duplicate setup, inactive licence presence, and reminder-day bounds. Maintains linked document rows and always writes retention history.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@DataRetentionId` | in | Null/0 inserts; otherwise updates that row |
| `@EmployerId` | in | Organisation |
| `@DataRetentionPeriod` | in | Days after deactivation to retain data |
| `@Comments` | in | Comments |
| `@IsSendEmailReminder` | in | Whether reminder emails are enabled |
| `@SendEmailReminBeforeDays` | in | Days before retention end to start reminders |
| `@EmailReminderFrequencyDays` | in | Reminder repeat interval |
| `@DocumentID` | in | Comma-separated document ids |
| `@CreatedBy` | in | Insert actor |
| `@UpdatedBy` | in | Update actor |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_Licence_InsertUpdateEmployerDataRetention
  participant Hist as SP_Licence_InsertEmployerDataRetention_History
  Caller->>Main: execute
  alt validation fails
    Main-->>Caller: IsValid 0 and ErrorMessage
  else insert or update
    Main->>Hist: DataRetentionId and action I or U
    Main-->>Caller: IsValid 1 and message
  end
```

## Callers

No other procedure calls this object. `dashBoardDAL.InsertUpdateEmployerDataRetention` executes it from Data Retention Setup.

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_Licence_InsertEmployerDataRetention_History` | procedure | after successful insert or update | [SP_Licence_InsertEmployerDataRetention_History](/docs/database/hrms/SP_Licence_InsertEmployerDataRetention_History) |

## Steps

1. Fail if an active retention already exists for the employer on insert.
2. Require a latest Inactive `TLicence` for the employer; fail if missing.
3. Fail when reminder days exceed retention period while reminders are on.
4. Compute retention and reminder date window from deactivation date.
5. Insert path: insert retention, insert document links from CSV, history with action `I`.
6. Update path: update retention fields, sync document active flags/sequences, history with action `U`.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TEmployerDataRetention` | read, write |
| `dbo.TLicence` | read |
| `dbo.TEmployerDataRetention_Documents` | write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start["SP_Licence_InsertUpdateEmployerDataRetention"] --> Valid{"Duplicate Inactive Reminder checks"}
  Valid -->|"fail"| Err["Select IsValid 0"]
  Valid -->|"ok"| Mode{"DataRetentionId is 0"}
  Mode -->|"yes"| Ins["Insert retention and docs"]
  Mode -->|"no"| Upd["Update retention and docs"]
  Ins --> Hist["SP_Licence_InsertEmployerDataRetention_History"]
  Upd --> Hist
  Hist --> Ok["Select IsValid 1"]
```
