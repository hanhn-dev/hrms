# Audience

Who uses the system and who reads this wiki.

## Users of the system (actors inferred from features & access control)

- **Employees** — apply for leave/WFH, regularize attendance, submit
  timesheets/expenses/travel, take training & surveys, raise comp-off and
  resignation requests.
- **Managers / Approvers** — act on routed requests via the approval engine
  (`TRequestWorkflows.ManagerId`); can be multiple levels deep.
- **HR / Admins** — configure leave types, workflows, roles/page access, org
  taxonomy; run reports; manage confirmation (CMS) and performance (PMS) cycles.
- **Recruiters** — recruitment/RRS flows (`InitiateHiring`, `InterviewFeedback`).
- **System / integration actors** — SSIS import jobs, timesheet integration
  partners, geo/IP attendance feeds, the ELMAH error logger, scheduled jobs for
  leave truncation/rollover and auto-confirmation. (Machine actors.)
- **Tenant organizations (Employers)** — the licensed customers; each is an
  isolated `Employerid` realm. See `experience/personas.md` for detail.

## Readers of this wiki

- **Engineers** working on the SQL layer who need the domain model, conventions,
  and the approval-engine contract before changing a procedure.
- **AI coding agents** (Claude Code sessions) — this wiki is the canonical
  knowledge source per the project `CLAUDE.md` *Knowledge Source Priority*. It is
  written to be answerable: vocabulary, schema, dispatch seams, and open
  questions are explicit so an agent can resolve a task without re-deriving the
  whole tree.
