# Part of the HRMS workspace

This folder is the **new HRMS Turborepo** (Backstage, az-mcp, db-mcp, `autofill`, `@hrms/db`). It is **not** classic My Details, Core API, or the Liquibase database.

Canonical repo map (read before choosing where to edit):
`AGENTS.md` at the `SourceCode` root.

Only change this repo for Backstage / MCP / `autofill` / `@hrms/db` work. Classic employee profile, search, Core Node API, `@hrms/sdk`, and `HRMS-DATABASE` live in the other workspace folders.

Form Autofill (Chrome MV3 extension) conventions: `apps/autofill/AGENTS.md`.
Operator console (former Troubleshooter) lives under Backstage `/features` — see `apps/backstage/AGENTS.md`. Components for ops screens are `antd`, icons are `@ant-design/icons`.

If the owning repo is not in the workspace, add that folder before editing.
