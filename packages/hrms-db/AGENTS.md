# `@hrms/db`

Troubleshooter data layer for HRMS SQL Server. Prisma is the typed client and parameterization host (`$queryRaw` / `$executeRaw`). Do not introduce Prisma `findMany` / `include` for joins.

Layout mirrors Troubleshooter `features/<domain>/<capability>/`. Domain folders are singular. Leaf folder is the capability only. No `employee/index.ts` or `employer/index.ts`.

```text
src/
  employee/
    access/          load, tree, writes
    leave/
    login/
    profile/
    search/
  employer/
    picker/          employer list + health
    settings/
    fields/
    roles/
  shared/
    employee/        resolve (used by several employee leaves)
    client.ts
    config.ts
    ids.ts
    iso.ts
  generated/prisma/  Prisma client (do not edit)
  index.ts           public barrel — re-exports leaves only
```

New query code goes in the matching leaf. Register new public names on the root barrel (`src/index.ts`). Apps import `from "@hrms/db"`. The access tree helpers also stay available as `@hrms/db/tree`.
