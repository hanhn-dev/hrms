/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@hrms/eslint-config/next.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            regex: "^\\.\\./",
            message:
              "Use the `@/` alias (e.g. `@/lib/features`) instead of parent-relative imports.",
          },
        ],
      },
    ],
  },
};
