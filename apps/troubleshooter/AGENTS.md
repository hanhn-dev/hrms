# Troubleshooter

Internal operator console for HRMS data and access diagnostics. Next.js 16 App Router + React 19 + Ant Design 6 + Tailwind 4. Port **5100**.

```bash
npm run troubleshooter                     # from repo root
npm run dev --workspace=apps/troubleshooter
```

Do **not** import `@hrms/ui`. Components are `antd` only. Icons are `@ant-design/icons` only.

In Server Components:
- Do not use dotted Ant Design subcomponents (`Typography.Title`). Import them from `@/shared/ui` (`Title`, `Text`, `Paragraph`) or the `antd/es/...` path. Dotted names are fine in `"use client"` files.
- Do not use `Descriptions.Item` / `DescriptionsItem` children in Server Components. Pass a serializable `items` array to `Descriptions` instead.
- Do not pass `render` (or other functions) in Ant Design `Table` `columns` from a Server Component. Put the table in a `"use client"` file that owns the column renderers.
- Use Alert `title`, not deprecated `message`.

## Layout

`src/app/` is a thin route map. Feature code lives under `src/features/<domain>/<capability>/` with a leaf barrel `index.ts`. Cross-cutting db, auth, theme, chrome, and resolve helpers live in `src/shared/`.

```text
src/
  app/                              routes only (URL shape is independent)
  features/
    auth/                           app-wide (operator login) — no domain
    employee/
      access|leave|login|profile|search
    employer/
      picker|settings|roles
  shared/auth|db|ui|theme|employee
```

Nest by **domain**, not by prefixing the feature name. Domain folders are singular. Leaf folders and files are the capability only — do not repeat `employee-` / `employer-` on the folder or file.

```text
# ❌ BAD — flat prefix folders
features/employee-access/employee-access-screen.tsx
features/employer-settings/employer-settings-screen.tsx
features/roles/                       # tenant roles belong under employer

# ✅ GOOD
features/employee/access/access-screen.tsx
features/employer/settings/settings-screen.tsx
features/employer/roles/roles-screen.tsx
```

- No domain-level barrel (`features/employee/index.ts`). Import the leaf: `@/features/employee/access`.
- Same capability on two domains = two folders (`employer/roles` vs a future `employee/roles`). Do not share one `features/roles`.
- App-wide concerns stay top-level (`auth`) or in `shared/` (`shared/employee` is resolve, not a screen).
- Do not flatten features to match URL segments, and do not grow a global `lib/queries` dump.
- New area: add `features/<domain>/<capability>/` plus a thin `src/app/` route.

Import with `@/` (`@/features/employee/access`, `@/shared/db`). No parent-relative `../`. Same-directory `./` is allowed.

## Auth and writes

Local credentials from `TROUBLESHOOTER_ADMIN_*`. The signed-in user is a root admin and can select any employer.

Writes require `TROUBLESHOOTER_WRITES_ENABLED=1`, a non-production `NODE_ENV`, and the cookie-selected environment listed in `TROUBLESHOOTER_WRITES_ENVS` (default `DEV`). Every write is preview → HMAC confirm token → `BEGIN TRAN` / `COMMIT`. Confirm tokens are bound to the selected environment. `TROUBLESHOOTER_AUDIT_USER_ID` must be a real `TUsers.UserID`.

Never call `SP_AdminRoleM_*`, `SP_InsertRolePageMapping`, or `sp_InsertDynamicMenuHierarchy`.

## Data rules

Data access goes through `@hrms/db` (`packages/hrms-db`). Do not query SQL Server from this app with `mssql` or raw strings. Do not call HRMS stored procedures.

Queries use the cookie-selected environment (`troubleshooter-env`). Register an environment by adding its name to `TROUBLESHOOTER_ENVS` and a complete `TROUBLESHOOTER_DB_{ENV}_*` block in `.env`. Unprefixed `TROUBLESHOOTER_DB_*` remains the DEV fallback. `REPLICA` is the read-only `HRM-CL-Prod-Replica` copy and must stay out of `TROUBLESHOOTER_WRITES_ENVS`. Switching environments keeps the current route and refreshes server data.

Resolve path: `EmploymentNumber` → `TEmployeeInfo` → `TEmployee` → `TUserEmployee` (highest UserID; flag mapping count > 1) → `TUsers.RoleID`. `UserID ≠ EmployeeId`.

The Access tree composes `TMenuHierarchy` (left nav, as stored) plus `TTabDetails` under each `MenuId`. Tab masters resolve with `Employerid IN (tenant, 0)`.

All queries are parameterized and server-only. Every query includes `Employerid`.
