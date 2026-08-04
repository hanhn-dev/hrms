# Rejected Ideas

"We considered X but chose Y because Z." The repository does not contain a
decision log, so this page holds only what the source itself evidences as a
reversed direction. Most entries are low-confidence inferences.

- **A single `ApproveStatus` on the leave request (rejected/removed).** The
  migration script `HRMS/DML/86966/Remove-ApproveStatus` indicates an
  `ApproveStatus` field/usage was deliberately removed in favor of the
  `TRequestWorkflows`-driven approval model. (Evidence: the migration name;
  exact before/after not read.)

- **Database-per-tenant (not chosen).** The shared-schema + `Employerid` model is
  pervasive; a per-tenant-database approach was evidently not taken. See
  `tradeoffs.md`.

- **Enforced foreign-key graph (largely not chosen).** Only a handful of FKs are
  declared; the rest of the relational integrity was left to procedure logic.

> This page is intentionally sparse. New genuinely-rejected options with stated
> reasons belong here (one paragraph each); architectural reversals with lasting
> consequences belong in an ADR under `../adr/`.

<!-- TODO: needs input — no decision log in repo; populate from team knowledge. -->
