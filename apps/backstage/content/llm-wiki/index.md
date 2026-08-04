# llm-wiki index

Canonical, source-derived knowledge base for the HRMS database repo (see
`../CLAUDE.md` for how this ranks against ADRs and source code). Start here,
then drill into the linked page.

## Identity
- [Purpose](identity/purpose.md) — why this system exists: multi-tenant HRMS database layer
- [Scope](identity/scope.md) — what's in vs. out of this repo
- [Audience](identity/audience.md) — who this wiki is written for
- [Principles](identity/principles.md) — guiding design principles observed in the code
- [Ownership](identity/ownership.md) — who owns which parts
- [Success criteria](identity/success-criteria.md) — what "working correctly" means for this system

## Architecture
- [System overview](architecture/system-overview.md) — tech stack, seven physical databases, component diagram
- [Module catalog](architecture/module-catalog.md) — the HRMS core + six satellite modules (TimePort, CRB Booking, Resource Allocation, Survey, Training, Travel&Expense)
- [Tenancy model](architecture/tenancy-model.md) — multi-tenant isolation via `Employerid`
- [Auth flow](architecture/auth-flow.md) — authentication/authorization path
- [Deployment topology](architecture/deployment-topology.md) — how the databases are deployed/connected
- [Event pipeline](architecture/event-pipeline.md) — async/event-driven paths, if any

## Domain
- [Overview](domain/overview.md) — domain map at a glance
- [Concept map](domain/concept-map.md) — how core entities relate
- [Employee lifecycle](domain/employee-lifecycle.md) — hire → active → separation
- [Leave lifecycle](domain/leave-lifecycle.md) — leave type config, apply, approve, balance accounting (`TLeaveBalanceLedger`)
- [Attendance lifecycle](domain/attendance-lifecycle.md) — attendance capture and regularization
- [Approval workflow](domain/approval-workflow.md) — the generic multi-level approval engine (`TWorkflowManagement`/`TRequestWorkflows`)
- [Background verification](domain/background-verification.md) — pre/post-employment BGV, its own status lifecycle (not routed through the approval engine)
- [Invariants](domain/invariants.md) — rules that must always hold
- [External logic](domain/external-logic.md) — logic that lives outside the DB (app tier assumptions)

## Reference
- [Data schema](reference/data-schema.md) — key tables with column-level notes
- Full table catalog (all ~1,367 tables, one file per module database, name-inferred
  descriptions + FK dependencies): [HRMS core](reference/tables/hrms.md) ·
  [TimePort](reference/tables/timeport.md) · [Training](reference/tables/training.md) ·
  [Travel & Expense](reference/tables/travelnexpense.md) ·
  [Resource Allocation](reference/tables/resourceallocation.md) ·
  [CRB Booking](reference/tables/crbbooking.md) · [Survey](reference/tables/survey.md)
- [Service APIs](reference/service-apis.md) — stored-procedure API surface
- [Dependency inventory](reference/dependency-inventory.md) — external/cross-database dependencies
- [Module dependency graph](reference/module-dependency-graph.md) — how modules depend on each other
- [Event catalog](reference/event-catalog.md) — notable triggers/events
- [Extension points](reference/extension-points.md) — where custom/tenant-specific logic plugs in

## Glossary
- [Terminology](glossary/terminology.md) — HRMS-specific terms
- [Business entities](glossary/business-entities.md) — core entity definitions
- [Acronyms](glossary/acronyms.md)
- [Ubiquitous language](glossary/ubiquitous-language.md) — shared vocabulary between code and business

## Conventions
- [SQL naming](conventions/sql-naming.md)
- [T-SQL style](conventions/tsql-style.md)
- [API standards](conventions/api-standards.md)
- [Branching strategy](conventions/branching-strategy.md)

## Decisions
- [Tradeoffs](decisions/tradeoffs.md)
- [Rejected ideas](decisions/rejected-ideas.md)
- [Future roadmap](decisions/future-roadmap.md)

## Assumptions
- [Inferred context](assumptions/inferred-context.md) — things inferred but not explicitly stated in code
- [Open questions](assumptions/open-questions.md) — known gaps/inconsistencies (e.g. `LeaveStatus` encoding) — check before trusting an area blindly

## Experience
- [Personas](experience/personas.md) — who uses the system (roles)
- [Surfaces](experience/surfaces.md) — UI/API surfaces this data layer serves

## Workflows
- [Onboarding](workflows/onboarding.md) — getting oriented in this repo
- [Debugging playbook](workflows/debugging-playbook.md)
- [Incident response](workflows/incident-response.md)
- [Release process](workflows/release-process.md)

## Quality
- [Testing strategy](quality/testing-strategy.md)

## Prompts
- [Code review](prompts/code-review.md)
- [Architecture review](prompts/architecture-review.md)

## ADR
- See `adr/` for individual architecture decision records (authoritative over this wiki when they conflict — see `../CLAUDE.md`).
