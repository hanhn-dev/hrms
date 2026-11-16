---
object: SP_CreateCertificateTemplateDesign
kind: procedure
database: hrms-rewardnrecognition
source: HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_CreateCertificateTemplateDesign.sql
last-analyzed: 2026-11-16
---

# SP_CreateCertificateTemplateDesign

## What it does

Inserts a new certificate custom template design into `TCertificateCustomTemplates`. Rejects duplicate names for the employer (including unique-constraint mapping). Returns the new row.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer scope |
| `@Name` | in | Template name |
| `@IssuingManagerEmployeeId` | in | Optional issuing manager employee id |
| `@IssuingManagerName` | in | Optional issuing manager name |
| `@DesignJson` | in | Design payload |
| `@CreatedByUserId` | in | Acting user |
| `@IsActive` | in | Active flag (default 1) |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_CreateCertificateTemplateDesign
  Caller->>Main: execute
  Main-->>Caller: new design row
```

## Callers

No other procedure executes this object. App callers: Rewards_and_Recognition certificate-template-designs create → [Admin Console](/docs/guides/reward-and-recognition/admin-console).

## Nested

Calls no other procedures or functions.

## Steps

1. Script is `HRMS-DATABASE/HRMS-RewardNRecognition/STORED_PROCEDURE/SP_CreateCertificateTemplateDesign.sql`.
2. Validate employer, name, and user.
3. Throw if an active (non-deleted) template with the same name exists.
4. Insert row; return selected new row.
5. Map unique-key violations to duplicate-name error.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TCertificateCustomTemplates` | read/write |

## Unresolved calls

None.

## Flow

```mermaid
flowchart TD
  Start[SP_CreateCertificateTemplateDesign] --> Validate[Validate inputs]
  Validate --> Dup{Name exists?}
  Dup -->|yes| Fail[Throw]
  Dup -->|no| Insert[Insert design]
  Insert --> EndNode[Return row]
```
