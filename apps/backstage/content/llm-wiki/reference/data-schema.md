---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TEmployee.sql
  - HRMS-DATABASE/HRMS/TABLES/TEmployerDetails.sql
  - HRMS-DATABASE/HRMS/TABLES/TLeaveTypeMaster.sql
  - HRMS-DATABASE/HRMS/TABLES/TLeaveRequest.sql
  - HRMS-DATABASE/HRMS/TABLES/TLeaveBalanceLedger.sql
  - HRMS-DATABASE/HRMS/TABLES/TWorkflowManagement.sql
  - HRMS-DATABASE/HRMS/TABLES/TRequestWorkflows.sql
  - HRMS-DATABASE/HRMS/TABLES/TRoles.sql
  - HRMS-DATABASE/HRMS/TABLES/TAuditTrail.sql
  - HRMS-DATABASE/HRMS/TABLES/THrmsModules.sql
confidence: medium
last-analyzed: 2026-06-26
---

# Data Schema (physical model)

The physical data model for the **most load-bearing core tables**, with verified
columns/keys. This is a curated backbone, not a full catalog of all ~1,100 HRMS
tables; columns shown are taken directly from the cited `CREATE TABLE` scripts.
Satellite-module tables are summarized in `../glossary/business-entities.md` and
`../architecture/module-catalog.md`.

## Cross-cutting column conventions

Confirmed across the tables below (see `../conventions/sql-naming.md`):

- **Tenant scope**: `Employerid INT` on nearly every operational table.
- **Audit columns**: `CreatedBy/CreatedDate`, `UpdatedBy/UpdatedDate` (casing
  varies — e.g. `createdby`/`createDate` on `TRoles`), plus UTC mirrors
  `CreatedDateUtcTime`/`UpdatedDateUtcTime` (`getutcdate()` default).
- **Soft delete**: `IsActive CHAR(1)` default `'Y'`, and/or `IsDelete`/
  `IsDeleted`/`isdeleted BIT`.
- **PII encryption**: sensitive fields as `VARBINARY(MAX)` `*_Encrypted`.
- **Indexing**: clustered PKs created `WITH (FILLFACTOR = 80|90)`.

## `dbo.TEmployee` (`TEmployee.sql`)

Employee master. PK `EmployeeId` IDENTITY, clustered FILLFACTOR 90.

| Column | Type | Notes |
|---|---|---|
| EmployeeId | INT IDENTITY | PK (`:2,64`) |
| FName_Encrypted / LName_Encrypted / MiddleName_Encrypted | VARBINARY(MAX) | encrypted name (`:3,4,19`) |
| DoB_Encrypted, TaxId_Encrypted, AadharNumber_Encrypted | VARBINARY(MAX) | encrypted PII (`:7,33,42`) |
| FName / LName / MiddleName / DoB / TaxId / AadharNumber | VARCHAR/DATE | plaintext mirrors (`:57-62`) |
| EmailID | VARCHAR(50) NOT NULL | login email (`:12`) |
| IsActive | CHAR(1) DEFAULT 'Y' | soft delete (`:13`); indexed `IX_TEmployee_IsActive` (`:73`) |
| RoleId, ShiftId, TitleID, MaritalStatusID | INT | FKs to masters (`:14,17,25,28`) |
| Employerid | INT | tenant scope (`:37`) |
| DeactivationDate | DATE | (`:45`) |
| IsPersonalFieldsDeleted, PersonalFieldsDeletedDate | CHAR(1)/DATETIME | PII-retention erasure (`:46-47`) |

FKs: `MaritalStatusID → TMaritalStatus(ID)`, `TitleID → TPersonalTitle(ID)`,
self-FK `EmployeeId → TEmployee(EmployeeId)` (`:65-68`).

## `dbo.TEmployerDetails` (`TEmployerDetails.sql`) — tenant root + config

PK NONCLUSTERED `Employerid` (FILLFACTOR 80), self-FK `Employerid → TEmployerDetails`.

Key columns: `EmployerName`, `EmployerGUID UNIQUEIDENTIFIER DEFAULT newid()`
(`:56`), tenant tree `ParentEmployerid`/`RootEmployerId` (`:20,48`),
`Employerid INT DEFAULT 0` (`:44`), licensing `LicenseCount`/`LicenseKey`
(`:18-19`), password policy `PasswordExpires`/`PasswordChangelimit`/
`PreventPasswords`/`FailedAttempts` (`:23-26`), attendance `AttendanceCaptureType`/
`IsIPBasedAttendance` (`:16,35`), time zone `TimeZone`/`TimeZoneId` (`:37,43`),
and **~50 boolean feature flags** (`IsAutomaticConfirmation`,
`IsPMSReviewerEnabled`, `IsReviewFrequencyEnabled`, ... `:61-94`) — this table
doubles as the per-tenant feature-flag store.

## `dbo.TLeaveTypeMaster` (`TLeaveTypeMaster.sql`) — leave policy

Composite PK `(LeaveCode CHAR(4), Employerid)` clustered (`:63`). Holds the full
leave rule set: `MaxDaysToApply`/`MinDaysToApply`/`WaitingPeriod`/
`MaximumApplications` (`:13-16`), half-day/pull-back/prefix-suffix flags
(`:7-23`), encashment (`:27-30`), carry-forward & truncation (`:31-41`),
comp-off (`IsLeaveTypeCompOff`, expiry columns `:43,59-62`), `IsLeaveTypePTO`,
`CreditRule CHAR(1) DEFAULT 'D'` (`:48-49`).

## `dbo.TLeaveRequest` (`TLeaveRequest.sql`) — leave application

PK `TransId` IDENTITY (FILLFACTOR 80). `LeaveCode`, `EmployeeId`, `Fromdate`/
`Todate`, `FromHalfday`/`TohalfDay`, `Noofdays DECIMAL(5,2)`,
`LeaveStatus VARCHAR(15)` (mixed encoding — see `../glossary/terminology.md`),
plus pull-back/cancellation tracking columns (`:21-27`). Per-day rows in
`TLeaveRequestDays`.

## `dbo.TLeaveBalanceLedger` (`TLeaveBalanceLedger.sql`) — balance ledger

PK `TransId BIGINT IDENTITY` (no explicit PK constraint in script — heap-like).
Append-only ledger: `LeaveCode`, `Employeeid`, `NoofDays DECIMAL(10,4)`,
`TransactionType CHAR(1)`, `TransactionSource VARCHAR(50)`,
`openingbalance`/`closingbalance DECIMAL(10,4)`, `leaveRequestid BIGINT`,
`ExpiryDate`/`NoofDaysToExpire` (`:1-16`).

## `dbo.TWorkflowManagement` (`TWorkflowManagement.sql`) — workflow definition

PK `WorkflowId` IDENTITY. `WorkflowName`, `RoutingLevels INT NOT NULL` (`:5`),
`MappedPages VARCHAR(200)` (`:6`), `WorkflowDefinitionTree VARCHAR(MAX)` (`:7`),
flags `Isdefault`/`isenable`/`SkipWorkFlow`/`IsWorkflowPartial`/
`IsEnableAutoApproved` (`:13-19`), `ModuleId → THrmsModules(ModuleId)` FK (`:21`),
`Employerid`. Indexed on `(MappedPages, IsDelete, Employerid)`.

## `dbo.TRequestWorkflows` (`TRequestWorkflows.sql`) — per-request routing rows

PK `Transid` IDENTITY (no explicit PK constraint in script). One row per approval
level: `RequestTransid` (→ originating artifact PK), `RequestType VARCHAR(50)`,
`ManagerId`, `WorkflowId`, `ApprovalLevel`, `IsApprove BIT`,
`ApproveStatus CHAR(1)` (`'P'`=pending), reassignment columns
`OldManagerId`/`ReassignReason`/`ReassignDate`, `IsAutoApprove` (`:1-21`).
Six covering indexes on `(RequestType, ManagerId, ApproveStatus, RequestTransid)`
permutations (`:26-56`) — read-heavy hot path.

## `dbo.TRoles` (`TRoles.sql`) — access role

PK `RoleID` IDENTITY. `RoleName`, `IsDefault`, `Employerid`, `IsActive CHAR(1) 'Y'`,
`IsGlobalAccess CHAR(1) 'N'`, `ReportingType INT` (`:1-14`).

## `dbo.TAuditTrail` (`TAuditTrail.sql`) — page-access audit

PK `Id`. `SessionID`, `PageName`, `UserName`, `AccessTime`, `Employerid` (`:1-9`).

## `dbo.THrmsModules` (`THrmsModules.sql`) — in-app feature module registry

PK `ModuleId` IDENTITY. `ModuleName`, `IsActive`, `DisplayOrder`,
`IsNotificationModule` (`:1-12`). Referenced by `TWorkflowManagement.ModuleId`.

> ⚠️ Heap tables: `TLeaveBalanceLedger` and `TRequestWorkflows` scripts declare
> IDENTITY columns but **no PRIMARY KEY / clustered index** — confirm whether a
> clustered index exists at runtime. Flagged in `../assumptions/open-questions.md`.
