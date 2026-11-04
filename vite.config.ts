import { defineConfig, lazyPlugins } from "vite-plus";

const buildSha = process.env.VITE_BUILD_SHA ?? "dev";

// Generated, vendored and record files that tools must not rewrite or lint.
const generated = [
  "dist/**",
  "coverage/**",
  "playwright-report/**",
  "test-results/**",
  "e2e/screenshots/**",
  "assets-src/**",
  ".cache/**",
];

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
    // Phaser alone is over 1 MB; scripts/check-size.mjs enforces the real budget.
    chunkSizeWarningLimit: 1600,
  },
  plugins: lazyPlugins(() => [
    {
      name: "build-sha-meta",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { name: "build", content: buildSha }, injectTo: "head" },
      ],
    },
  ]),

  // `vp test` (Vitest). Benchmarks use vitest.perf.config.ts instead.
  test: {
    // scripts/__tests__ runs the repository checks against fixtures, so a broken gate cannot pass.
    include: ["src/**/__tests__/**/*.test.ts", "scripts/__tests__/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      // Enabled by `npm test` (`vp test run --coverage`), so filtered runs such as
      // `npx vp test run pbt` are not held to the thresholds.
      provider: "v8",
      include: ["src/**/*.ts"],
      // Phaser rendering code runs only in a browser; the Playwright smoke covers it.
      // Keep logic out of these paths so that it stays unit-tested.
      exclude: [
        "src/**/__tests__/**",
        "src/**/__perf__/**",
        "src/main.ts",
        "src/game/boot.ts",
        "src/game/scenes/**",
        "src/game/fx/**",
        "src/game/ui/**",
      ],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
      reporter: ["text", "text-summary", "json-summary", "html"],
    },
  },

  // `vp lint` and `vp check` (Oxlint, type-aware through TypeScript 7).
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc"],
    categories: { correctness: "error", suspicious: "error" },
    env: { builtin: true },
    ignorePatterns: generated,
    options: { typeAware: true, typeCheck: true, reportUnusedDisableDirectives: "error" },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/no-explicit-any": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
      // Size limits keep each unit reviewable on a phone-sized diff.
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", { max: 5 }],
      "max-depth": ["error", { max: 4 }],
      "max-nested-callbacks": ["error", { max: 4 }],
      complexity: ["error", { max: 15 }],
      // `window.__game` is the e2e contract (AGENTS.md), and scenes cannot use Phaser's `game`.
      "no-underscore-dangle": "off",
      // `[...xs].sort()` is the house idiom; `toSorted` is not in the ES2022 lib we target.
      "unicorn/no-array-sort": "off",
      // TypeScript already rejects a function that can fall off the end of a non-exhaustive switch.
      "typescript/consistent-return": "off",
    },
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    overrides: [
      { files: ["src/**/*.ts"], env: { browser: true } },
      {
        files: ["scripts/**/*.mjs", "scripts/**/*.ts", "*.ts", "e2e/**/*.ts", "perf/**/*.ts"],
        env: { node: true },
      },
      {
        // page.evaluate() runs in the browser, where the test cannot import the game's types.
        files: ["e2e/**/*.ts"],
        rules: { "typescript/no-unsafe-type-assertion": "off" },
      },
      {
        // These paths are excluded from coverage and mutation testing (ADR 0003), so nothing
        // checks their logic. Tighter limits push any logic into src/game/*.ts or src/domain/,
        // where it is unit-tested. Keep this list equal to the `exclude` lists in `test.coverage`
        // above and in stryker.config.json.
        files: [
          "src/main.ts",
          "src/game/boot.ts",
          "src/game/scenes/**/*.ts",
          "src/game/fx/**/*.ts",
          "src/game/ui/**/*.ts",
        ],
        rules: {
          "max-lines-per-function": [
            "error",
            { max: 30, skipBlankLines: true, skipComments: true },
          ],
          complexity: ["error", { max: 5 }],
        },
      },
      {
        // The reducer is pure: same state and event, same result. Time, randomness and the
        // browser come in through events or an injected RNG, never from globals.
        files: ["src/domain/**/*.ts"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              paths: [{ name: "phaser", message: "src/domain must stay pure: no Phaser." }],
              patterns: [
                { group: ["phaser/*"], message: "src/domain must stay pure: no Phaser." },
                {
                  group: ["**/game/**", "../game", "../game/*"],
                  message: "src/domain must not depend on src/game.",
                },
              ],
            },
          ],
          "no-restricted-properties": [
            "error",
            { object: "Math", property: "random", message: "Use the injected RNG." },
          ],
          "no-restricted-globals": [
            "error",
            { name: "Date", message: "Pass time in through an event." },
            { name: "performance", message: "Pass time in through an event." },
            { name: "crypto", message: "Use the injected RNG." },
            ...[
              "window",
              "globalThis",
              "document",
              "navigator",
              "localStorage",
              "sessionStorage",
              "fetch",
              "XMLHttpRequest",
              "setTimeout",
              "setInterval",
              "requestAnimationFrame",
            ].map((name) => ({ name, message: "src/domain must stay pure: no browser APIs." })),
          ],
        },
      },
    ],
  },

  // `vp fmt` and `vp check` (Oxfmt). Code only: prose, records and workflows are left as written.
  fmt: {
    ignorePatterns: [
      ...generated,
      "**/*.md",
      "docs/**",
      ".kiro/**",
      ".github/**",
      "public/**",
      "package-lock.json",
    ],
  },
});
