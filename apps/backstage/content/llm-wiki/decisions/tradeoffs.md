# Tradeoffs

Where two valid approaches were weighed and the resolution wasn't ADR-worthy.
These are read off the code's shape; the reasoning is partly inferred and noted
as such.

- **Logic in the database vs in the app tier.** The system puts the bulk of
  business logic in T-SQL procedures. Tradeoff taken: centralized, transactional,
  reusable across callers (web + mobile) — at the cost of testability,
  refactorability, and ~5,000 procedures to maintain. (Observed; rationale
  inferred.)

- **Shared-schema multi-tenancy vs database-per-tenant.** Chosen: one schema,
  `Employerid` row scoping. Tradeoff: cheap onboarding and single-codebase
  upgrades vs the constant risk that a query forgets the tenant filter and the
  absence of hard isolation. See `../architecture/tenancy-model.md`.

- **By-convention relationships vs enforced foreign keys.** Most `*Id` links are
  not FKs; only a few are declared. Tradeoff: faster bulk loads / fewer
  constraint conflicts during imports and edits vs weaker integrity guarantees
  (integrity moved into procedures).

- **Soft delete + history tables + dated backups vs hard delete.** Chosen:
  preserve everything (`IsActive`, `_History`, `_bkp<date>`, append-only ledgers).
  Tradeoff: full auditability and recoverability vs table sprawl and the "which
  object is live?" ambiguity that pervades the tree.

- **Additive, backward-compatible change vs refactor.** New behaviour arrives as
  new nullable columns / flags / versioned objects. Tradeoff: low deployment risk
  and no breaking the external app vs accumulated drift (mixed status encodings,
  inconsistent casing, near-duplicate procedures).

- **Per-tenant feature flags on `TEmployerDetails` vs separate config tables.**
  Chosen: ~50 flag columns on the employer row. Tradeoff: simple to read/join in
  one place vs an ever-widening table and schema churn for each new toggle.

- **Verbose XML approval payloads vs a generic change table.** The admin-change
  builders hand-construct large per-field XML (`SP_AddNewLeaveTypeMaster`).
  Tradeoff: self-describing change records for the approval UI vs heavy,
  repetitive procedure bodies.
