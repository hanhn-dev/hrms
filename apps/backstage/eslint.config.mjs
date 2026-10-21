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
      // React Compiler rules added in eslint-plugin-react-hooks 7. The app is not
      // on the compiler, and these did not run under Next.js 16.3's next lint.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/globals": "off",
      "no-restricted-imports": [
        "error",
        {
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
