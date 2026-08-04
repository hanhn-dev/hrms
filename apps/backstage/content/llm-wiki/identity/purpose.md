# Purpose

Why this system exists, derived from the database objects it contains.

This repository is the **database layer of a multi-tenant Human Resource
Management System (HRMS)** built on Microsoft SQL Server. It implements, almost
entirely in T-SQL stored procedures and functions, the back-end logic for the
full employee lifecycle and the HR operations around it:

- **People & organization** — store and manage employees (`TEmployee`) under
  tenant employers (`TEmployerDetails`), organized by business unit, department,
  grade, location, and role.
- **Leave & attendance** — configurable leave policies (`TLeaveTypeMaster`),
  leave applications and balances (`TLeaveRequest`, `TLeaveBalanceLedger`),
  attendance capture and regularization.
- **HR processes** — resignation/separation, background verification (BGV),
  recruitment, probation→confirmation (CMS), and performance management (PMS).
- **Workflow & governance** — a configurable, multi-level **approval engine**
  (`TWorkflowManagement` + `TRequestWorkflows`) that routes nearly every
  employee request *and* every administrative configuration change for approval.
- **Adjacent HR domains** — six satellite databases extend the core for
  timesheets, training, travel & expense, resource allocation, conference-room
  booking, and surveys.

The system's reason to exist is to be the **authoritative, tenant-isolated
system of record and rules engine** for HR data and approvals, callable by an
application tier through a large stored-procedure API surface.

> The business *intent* behind specific policies (why certain rules exist, SLAs,
> regulatory drivers) is not expressed in the SQL. Where intent matters it is
> recorded as an open question rather than invented — see
> `../assumptions/open-questions.md`.
