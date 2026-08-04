# Incident Response

How production incidents are handled. The repository contains no runbook,
paging config, or severity definitions, so this page records only what the
source implies and flags the rest as unknown.

## What the source supports

- **Error signal**: `ELMAH_Error` (written by `ELMAH_LogError`) is the primary
  in-database error feed; the ELMAH/ASP.NET layer surfaces it.
- **Audit signal**: `TAuditTrail` (page access), `TActivityLog`/`TActivityLogTypes`
  (activity), and `TDeviceInvalidLoginAttemptDetails` (auth abuse) are the
  forensic trails for "who did what / suspicious access".
- **Recovery aids**: `*_bkp<date>` table snapshots and `*_History` shadow tables
  support point-in-time data recovery for a specific table.
- **Blast radius**: an incident in a satellite database can break HRMS procedures
  that reference it via synonyms — check `../reference/module-dependency-graph.md`
  when triaging cross-module failures.

## Not defined in the repo

- Severity levels / SLAs, on-call/paging, comms channels, and a postmortem
  template are all external (Azure DevOps / ops tooling).

<!-- TODO: needs input — incident severity, paging, and postmortem process are
defined outside this repository. See assumptions/open-questions.md. -->
