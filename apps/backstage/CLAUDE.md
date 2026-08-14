@AGENTS.md

# Backstage (Claude)

Import app modules with `@/` (`@/lib/features`, `@/components/site-search`). Do not use parent-relative `../` paths. Same-directory `./` is allowed for colocated siblings and CSS (`./globals.css`). Alias is defined in `tsconfig.json` (`@/*` → `./*`) and enforced by `no-restricted-imports` in `.eslintrc.js`.
