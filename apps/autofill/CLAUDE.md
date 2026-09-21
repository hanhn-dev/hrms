@AGENTS.md

# Form Autofill (Claude)

Chrome MV3 extension. Full layout, message contract, and fill/inject rules are in `AGENTS.md` in this directory.

Import app modules with `@/` (`@/features/fill`, `@/shared/messaging`). Same-directory `./` is allowed. The alias is `tsconfig.json` `paths`: `@/*` → `src/*`. Do not call `chrome.storage` outside `src/shared/storage.ts` (service worker only).

Do not import `@hrms/ui`. Components are `antd` only. Icons are `@ant-design/icons` only.
