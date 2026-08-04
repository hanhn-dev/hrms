# Business Entities

The core business nouns of the HRMS, each backed by one or more tables. One
short paragraph per entity; cross-linked to `../domain/*`. Table names are
`dbo.` objects in the relevant module database.

- **Employer / Organization** — the tenant. `TEmployerDetails` (PK `Employerid`)
  is the tenant root and per-tenant configuration store. Employers form a tree
  via `ParentEmployerid` / `RootEmployerId`, carry a `LicenseKey`/`LicenseCount`,
  password policy, time zone, and dozens of feature-flag columns
  (`TEmployerDetails.sql:20,44,48`). Almost every operational table carries an
  `Employerid` column for tenant scoping. See `../architecture/tenancy-model.md`.

- **Employee** — a person employed by an Employer. `TEmployee` (PK identity
  `EmployeeId`) holds personal data; PII fields are stored encrypted as
  `VARBINARY` (`*_Encrypted`) alongside plaintext mirrors, and soft-deleted via
  `IsActive CHAR(1)` and `DeactivationDate` (`TEmployee.sql:3,13,45`). Satellite
  data lives in `TEmployee*` tables (bank, contact, family, assets, documents).

- **Role** — an access-control role. `TRoles` (PK `RoleID`, scoped by
  `Employerid`) with `IsGlobalAccess`, `ReportingType`, `IsActive`
  (`TRoles.sql:1-14`). Page/tab access is mapped through `TRolePagesMapping`,
  `TRoleBasePagesAccess`, `TRoleTabDetails`.

- **Business Unit / Department / Grade / Location / Designation** — the org
  taxonomy used to slice policy and reporting: `TBusinessUnit`, `TDepartment`,
  `TGrade`, `TLocation`, plus designation tables. Leave/attendance policy can be
  targeted at these dimensions (see leave-type config below).

- **Leave Type** — a configurable leave policy. `TLeaveTypeMaster`
  (composite PK `LeaveCode, Employerid`) carries the full rule set: half-day,
  pull-back, encashment, carry-forward, comp-off, accrual and re-initialization
  (`TLeaveTypeMaster.sql:1-64`). See `../domain/leave-lifecycle.md`.

- **Leave Request** — an employee leave application. `TLeaveRequest`
  (PK `TransId`) with `TLeaveRequestDays` for per-day breakdown; balance is
  tracked in `TLeaveBalanceLedger` (debit/credit ledger) and `TLeaveBalance`.

- **Attendance** — daily presence. `TAttendanceTransaction` (punch source),
  `TAttendance`, `TAttendanceRegularization` (correction requests). Capture mode
  is governed by `TEmployerDetails.AttendanceCaptureType` and IP/geo settings.

- **Workflow / Approval Request** — the cross-cutting approval engine.
  `TWorkflowManagement` defines a named, multi-level workflow with a
  `WorkflowDefinitionTree` and `RoutingLevels`, mapped to a module/page
  (`TWorkflowManagement.sql:1-22`). `TRequestWorkflows` holds the per-request
  routing rows (one per approval level/manager) the engine walks
  (`TRequestWorkflows.sql:1-22`). See `../domain/approval-workflow.md`.

- **Resignation / Separation** — employee exit. `TResignation` (separation-type
  master), `TResignationDetails`, `TResignationActivityDetails`.

- **Timesheet (TIMEPORT)** — `TTSEmpTimeSheet`, `TSEmpTimesheetStatus`, plus an
  integration layer (`TIntegration*`) for pushing/pulling timesheets to external
  partners. Lives in the `HRM_CL_TIMEPORT` database.

- **Training (TRAINING)** — `TTraining`, `TTrainingAssignment*`, `TTNI_*`
  (training-needs identification), `TQuiz*`/`TAssessment*`/`TEvaluation*`. Lives
  in the `Training` database.

- **Travel & Expense (TNE)** — `TTRAVEL_REQUEST`, `TEXPENSE` + per-category
  expense tables (`TEXPENSE_TRAVEL`, `TEXPENSE_STAY`, `TEXPENSE_FOODNBEV`, ...),
  advances (`tAdvance*`). Lives in the `TravelNExpense_Prod` database.

- **Resource Allocation (RAS)** — `TRESOURCEALLOCATION`, owners/lock matrix
  (`TRESOURCE_ALLOCATION_OWNER`, `TRAS_LOCK_MATRIX`). Lives in `ResourceAllocation`.

- **Conference Room Booking (CRB)** — `TCONFBOOKINGS`, `TROOM_DETAILS`,
  `TVirtualRoom*`. Lives in `HRM_CRBooking_Prod`.

- **Survey** — `TSurvey`, `TSurveyQuestions`, `TParticipants`. Lives in `SURVEY`.

- **Claim / Email Notification** — recurring cross-module nouns. `TCLAIM` /
  `TCLAIM_ASSIGNMENT` and `TEMAIL_NOTIFICATION` appear in nearly every satellite
  module as the notification/claim plumbing.
