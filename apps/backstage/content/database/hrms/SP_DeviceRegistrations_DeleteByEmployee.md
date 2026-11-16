---
object: SP_DeviceRegistrations_DeleteByEmployee
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_DeviceRegistrations_DeleteByEmployee.sql
last-analyzed: 2026-11-09
---

# SP_DeviceRegistrations_DeleteByEmployee

## What it does

Deletes mobile/device registration rows for one employer + employee pair. Used as cleanup when an employee is deactivated.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@EmployerId` | in | Employer (required, &gt; 0) |
| `@EmployeeId` | in | Employee (required, &gt; 0) |
| `@ReturnResult` | in | When 1, return success/message/count row |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_DeviceRegistrations_DeleteByEmployee
  participant DB as Database
  Caller->>Main: execute
  Main->>DB: delete TDeviceRegistrations rows
```

## Callers

Nested from `SP_SEP_DeActivateEmployee_BY_ID` after a successful deactivate.

## Nested

None.

## Steps

1. Script is `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_DeviceRegistrations_DeleteByEmployee.sql`.
2. Validate employer and employee ids.
3. `DELETE` from `TDeviceRegistrations` for that pair.
4. Optionally return deleted count.

## Tables

| Table | Read or write |
|---|---|
| `dbo.TDeviceRegistrations` | write (delete) |

## Flow

```mermaid
flowchart TD
  Start[Delete devices] --> Valid{Ids valid}
  Valid -->|no| Err[Return failure]
  Valid -->|yes| Del[Delete registrations]
  Del --> Ok[Return success count]
```
