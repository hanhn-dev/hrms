@AGENTS.md

# Backstage (Claude)

Import app modules with `@/` (`@/features/employer/picker`, `@/shared/db`, `@/lib/guides`, `@/components/site-search`). Do not use parent-relative `../` paths. Same-directory `./` is allowed for colocated siblings and CSS (`./globals.css`). Alias is defined in `tsconfig.json` (`@/*` → `./*`) and enforced by `no-restricted-imports` in `.eslintrc.js`.

Backstage is **feature-based**: new interactive work goes in `features/<domain>/<capability>/` with a thin `app/` route. See `AGENTS.md` § App architecture.
