// Git Bash keeps a lowercase drive letter (d:\). Vitest 4.1.10 then loads two
// copies of its runtime and describe() throws. Respawn from the canonical
// path (D:\) so the worker and the test file share one copy.
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const packageJson = realpathSync.native(
  require.resolve("vitest/package.json"),
);
const vitest = realpathSync.native(
  path.join(path.dirname(packageJson), "vitest.mjs"),
);
const cwd = realpathSync.native(process.cwd());

const result = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
