This file provides guidance to Claude Code when working in `apps/db-mcp`.

## Build tooling

Bundles via `tsdown` using the app-local `tsdown.config.ts`. The runtime artifact is always `dist/index.js` — `build`, `start`, and `inspect` scripts must all agree on that path. If you change build tooling here, also update: this app's `package.json` scripts, root `inspect:db`, any build-contract tests, and maintainer-facing docs describing the build/inspect flow. Keep runtime-sensitive dependencies external rather than bundled when bundling them would weaken reliability.
