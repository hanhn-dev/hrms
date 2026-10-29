# `@hrms/db`

Troubleshooter data layer for HRMS SQL Server. Prisma is the typed client and parameterization host (`$queryRaw` / `$executeRaw`). Do not introduce Prisma `findMany` / `include` for joins.

Layout mirrors Troubleshooter `features/<domain>/<capability>/`. Domain folders are singular. Leaf folder is the capability only. No `employee/index.ts` or `employer/index.ts`.

```text
src/
  dbs/               Data Builder Studio (catalog helpers, SELECT guard, row preview)
  employee/
    access/          load, tree, writes
    business-unit/
    leave/
    login/
    profile/
    search/
  employer/
    picker/          employer list + health
    settings/
    fields/
    roles/
    uploads/
    workflows/
  shared/
    employee/        resolve (used by several employee leaves)
    client.ts
    config.ts
    ids.ts
    iso.ts
  generated/prisma/  Prisma client (do not edit)
  index.ts           public barrel — re-exports leaves only
```

`dbs/` is system-scoped (optional `employerId` on data APIs). Do not nest it under `employer/`.

New query code goes in the matching leaf. Register new public names on the root barrel (`src/index.ts`). Apps import `from "@hrms/db"`. Pure helpers that Client Components need stay on subpaths so they never pull Prisma/`client.ts` — e.g. `@hrms/db/ids`, `@hrms/db/tree`, `@hrms/db/org-unit-tree`.

List queries return one page from `src/shared/page.ts` (`LIST_PAGE_SIZE`, `pageQuery`, `searchText`) with `COUNT(*) OVER()`, `OFFSET` / `FETCH NEXT`, and a stable `ORDER BY`. Empty and one-character searches return page 1 of the ordered set. One-record reads stay unbounded. See `.cursor/rules/bounded-reads.mdc`.
