@AGENTS.md

# Troubleshooter (Claude)

Import app modules with `@/` (`@/features/employer/picker`, `@/features/employee/access`, `@/shared/db`). Do not use parent-relative `../` paths. Same-directory `./` is allowed. Components are `antd` only. Icons are `@ant-design/icons` only.

Display dates through `@/shared/format-date` (`DD-MMM-YYYY`, plus `HH:mm:ss` when the value has a clock time).
