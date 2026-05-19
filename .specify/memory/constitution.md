<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Modified sections:
  - Technology Stack & Quality Gates
  - Development Workflow
Added guidance:
  - MCP app bundling policy using tsdown
  - Build-host Node.js minimum for bundling workflows
Templates updated:
  - None
Deferred TODOs: None
-->

# HRMS Constitution

## Core Principles

### I. TypeScript-First (NON-NEGOTIABLE)

All source code MUST be written in TypeScript. JavaScript files are forbidden
in `apps/` and `packages/` (except generated config shims). The following rules
apply at all times:

- Strict mode MUST be enabled (`"strict": true` in tsconfig).
- `any` is forbidden; use `unknown` and narrow types explicitly.
- All public function signatures MUST carry explicit return types.
- Prefer `interface` for object shapes exposed across package boundaries;
  use `type` aliases for unions, intersections, and local shapes.
- Enums are forbidden; use `const` objects with `as const` and derive union
  types via `typeof`.
- All shared types MUST live in a dedicated package (e.g., `packages/types`)
  and MUST NOT be duplicated across packages.

### II. Functional Programming

Business logic MUST follow functional-programming principles to maximise
predictability and testability:

- Pure functions are the default. A function MUST NOT produce side effects
  unless it is explicitly an I/O boundary (API call, DB write, file access).
- Mutation of shared state is forbidden. Use immutable updates (`Object.assign`,
  spread, `Array.prototype.map/filter/reduce`, or Immer).
- Data transformation pipelines MUST use composition over imperative loops
  wherever readability is maintained.
- React components MUST be function components; class components are forbidden.
- Side effects in React MUST be isolated to `useEffect`, server actions, or
  explicit service modules—never inline in render logic.
- Utility functions MUST be stateless and free of framework imports.

### III. Test-First (NON-NEGOTIABLE)

Tests MUST be written before implementation (TDD Red-Green-Refactor cycle):

1. Write a failing test that describes the expected behaviour.
2. Obtain approval that the test adequately covers the requirement.
3. Implement only enough code to make the test pass.
4. Refactor while keeping tests green.

Coverage thresholds MUST NOT drop below:

- **Unit**: 80 % statement coverage per package.
- **Integration**: Every public API route and server action MUST have at least
  one happy-path and one error-path integration test.
- **E2E**: Every P1 user story MUST have a passing E2E scenario before merge.

Test files MUST co-locate with the code they test using the `.test.ts(x)` or
`.spec.ts(x)` suffix, or reside in a sibling `__tests__/` directory. A
dedicated `tests/e2e/` directory is used for end-to-end scenarios.

### IV. User Experience Consistency

Every UI surface MUST conform to the shared design system defined in
`packages/ui`:

- Components MUST be sourced from `@hrms/ui` before creating new ones. A net-new
  component is only permitted when `@hrms/ui` cannot satisfy the requirement and
  a corresponding addition to `@hrms/ui` is delivered in the same PR.
- Visual design tokens (colour, spacing, typography, radius) MUST be consumed
  from the design-token layer; hardcoded values are forbidden.
- Every interactive element MUST meet WCAG 2.1 AA accessibility requirements
  (keyboard navigation, ARIA roles, colour contrast ≥ 4.5:1 for text).
- Loading, empty, and error states MUST be handled for every data-fetching
  surface—a component is not considered complete until all three states render.
- Forms MUST provide inline validation feedback; batch-only validation is
  forbidden.

### V. Performance by Design

Performance constraints are non-negotiable architectural requirements, not
post-launch optimisations:

- **Initial load**: Largest Contentful Paint (LCP) MUST be ≤ 2.5 s on a simulated
  4G connection (Lighthouse lab conditions).
- **Interaction**: First Input Delay (FID) / Interaction to Next Paint (INP)
  MUST be ≤ 200 ms.
- **Bundle size**: Each Next.js page MUST NOT exceed 200 kB of JavaScript
  (gzipped) on first load. Code-splitting via `next/dynamic` is mandatory for
  any component > 50 kB.
- **Server responses**: API routes and server actions MUST respond within 500 ms
  at p95 under expected load.
- **Images**: All images MUST use `next/image` for automatic optimisation; raw
  `<img>` tags are forbidden.
- Performance budgets MUST be tracked in CI; a PR that regresses any budget by
  more than 10 % MUST be rejected automatically.

## Technology Stack & Quality Gates

**Monorepo tooling**: Turborepo + npm workspaces (Node ≥ 22.18 for local and CI build hosts, npm ≥ 10).
**Framework**: Next.js (App Router) for all `apps/`.
**Language**: TypeScript 5.x (strict mode).
**Styling**: CSS Modules or Tailwind CSS (project-wide choice MUST be consistent).
**Build tooling**: MCP server apps that ship repository-owned runtime artifacts MUST bundle through `tsdown` using app-local configuration unless a planned migration explicitly approves a different bundler.
**Testing**: Vitest for unit/integration; Playwright for E2E.
**Linting**: ESLint via `@hrms/eslint-config`; Prettier for formatting.
**CI gates** (all MUST pass before merge):
  - `npm run lint` — zero errors.
  - `npm run build` — clean build across all packages.
  - Unit/integration test suite — no failures, coverage thresholds met.
  - TypeScript compilation — zero errors (`tsc --noEmit`).
  - Lighthouse CI — performance budgets not regressed > 10 %.

## Development Workflow

- **Feature branches**: All work MUST occur on a feature branch created via
  `/speckit.git.feature`. Direct commits to `main` are forbidden.
- **Spec-first**: Every feature MUST have an approved spec (`spec.md`) and plan
  (`plan.md`) before implementation begins.
- **PR reviews**: All pull requests require at least one approving review.
  Reviewers MUST verify compliance with this constitution.
- **Dependency updates**: Third-party dependencies MUST be pinned to exact
  versions in `package.json`. Range operators (`^`, `~`) are permitted only in
  `devDependencies`.
- **Bundling changes**: Any MCP app bundling change MUST update the app package
  build script, the maintained runtime artifact path, root workflow scripts,
  focused validation coverage, and maintainer-facing guidance in the same
  feature.
- **Breaking changes**: Any change to a shared package's public API MUST
  increment the package's major version and MUST include a migration note in
  the PR description.
- **Secrets**: Secrets and credentials MUST NOT be committed to the repository.
  Use environment variables validated at startup via a typed schema (e.g., Zod).

## Governance

This constitution supersedes all other documented or informal practices. It
applies to every contributor and every line of code merged into the repository.

- **Amendments** require a written proposal, review by at least two contributors,
  and an update to this file with an incremented version number and a Sync
  Impact Report.
- **Compliance reviews** MUST be conducted at the start of every new feature
  cycle and as part of each PR review.
- **Version policy** follows semantic versioning:
  - MAJOR: backward-incompatible removal or redefinition of a principle.
  - MINOR: new principle or section added.
  - PATCH: clarification or wording refinement with no semantic change.
- Complexity introduced in violation of a principle MUST be explicitly justified
  in the PR description using the Complexity Tracking table from
  `.specify/templates/plan-template.md`.
- Runtime development guidance is maintained in `.github/copilot-instructions.md`.

**Version**: 1.1.0 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-19
