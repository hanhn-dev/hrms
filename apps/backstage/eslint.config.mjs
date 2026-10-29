import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const requireFromSharedConfig = createRequire(
  fileURLToPath(new URL("../../packages/eslint-config/package.json", import.meta.url)),
);
const prettier = requireFromSharedConfig("eslint-config-prettier");
const turbo = requireFromSharedConfig("eslint-config-turbo/flat");
const onlyWarn = requireFromSharedConfig("eslint-plugin-only-warn");

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  ...turbo.default,
  {
    plugins: {
      "only-warn": onlyWarn,
    },
    rules: {
      // Runtime env is read in the Next server, not declared as Turbo task inputs.
      "turbo/no-undeclared-env-vars": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useMemo", "useCallback", "memo"],
              message:
                "Backstage uses the React Compiler. Do not import useMemo, useCallback, or memo.",
            },
          ],
          patterns: [
            {
              regex: "^\\.\\./",
              message:
                "Use the `@/` alias (e.g. `@/lib/guides`) instead of parent-relative imports.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
