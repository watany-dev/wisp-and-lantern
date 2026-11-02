import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "coverage/",
      "playwright-report/",
      "test-results/",
      "e2e/screenshots/",
      "assets-src/",
      ".cache/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.mjs", "*.js", "*.ts", "e2e/**/*.ts", "perf/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "phaser", message: "src/domain must stay pure: no Phaser." }],
          patterns: [{ group: ["phaser/*"], message: "src/domain must stay pure: no Phaser." }],
        },
      ],
    },
  },
);
